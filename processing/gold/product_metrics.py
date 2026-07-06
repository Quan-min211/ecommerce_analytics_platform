"""
Lớp Gold: Xây dựng bảng Product Metrics (Phân tích sản phẩm)
Tính toán các chỉ số thống kê từ Reviews và Join với thông tin Products.
"""

import sys
from pathlib import Path
from loguru import logger
from pyspark.sql.functions import (
    col, avg, count, sum as spark_sum, when, round as spark_round, current_timestamp, row_number
)
from pyspark.sql.window import Window

project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from processing.utils.spark_session import get_spark_session


def create_product_metrics():
    spark = get_spark_session("GoldProductMetrics")
    
    silver_products_path = str(project_root / "data" / "silver" / "products")
    silver_reviews_path = str(project_root / "data" / "silver" / "reviews")
    gold_metrics_path = str(project_root / "data" / "gold" / "product_metrics")
    
    logger.info("Đang đọc dữ liệu từ Silver Layer...")
    try:
        df_products = spark.read.format("delta").load(silver_products_path)
        df_reviews = spark.read.format("delta").load(silver_reviews_path)
    except Exception as e:
        logger.error(f"Không thể đọc Silver data: {e}")
        return

    logger.info("Đang tính toán các chỉ số phân tích (Metrics)...")
    
    # 1. Tổng hợp dữ liệu từ Reviews
    reviews_agg = df_reviews.groupBy("product_id").agg(
        count("review_id").alias("total_reviews"),
        spark_round(avg("rating"), 2).alias("avg_rating"),
        spark_sum(when(col("rating") == 5, 1).otherwise(0)).alias("star_5_count"),
        spark_sum(when(col("rating") == 4, 1).otherwise(0)).alias("star_4_count"),
        spark_sum(when(col("rating") == 3, 1).otherwise(0)).alias("star_3_count"),
        spark_sum(when(col("rating") == 2, 1).otherwise(0)).alias("star_2_count"),
        spark_sum(when(col("rating") == 1, 1).otherwise(0)).alias("star_1_count")
    )
    
    # Tính thêm phần trăm đánh giá 5 sao
    reviews_agg = reviews_agg.withColumn(
        "star_5_percentage",
        spark_round((col("star_5_count") / col("total_reviews")) * 100, 2)
    )

    # 2. Join với bảng Products
    # Sử dụng left_outer join để giữ lại tất cả sản phẩm, kể cả sản phẩm chưa có review
    if "scraped_at" in df_products.columns:
        latest_window = Window.partitionBy("product_id").orderBy(col("scraped_at").desc_nulls_last())
        df_products_latest = (
            df_products
            .withColumn("_snapshot_rank", row_number().over(latest_window))
            .filter(col("_snapshot_rank") == 1)
            .drop("_snapshot_rank")
        )
    else:
        df_products_latest = df_products.dropDuplicates(["product_id"])

    gold_df = df_products_latest.join(reviews_agg, on="product_id", how="left_outer")
    
    # Xử lý null cho các sản phẩm không có review
    gold_df = gold_df.fillna({
        "total_reviews": 0,
        "avg_rating": 0.0,
        "star_5_count": 0,
        "star_4_count": 0,
        "star_3_count": 0,
        "star_2_count": 0,
        "star_1_count": 0,
        "star_5_percentage": 0.0
    })

    # Thêm timestamp processing_time
    gold_df = gold_df.withColumn("gold_processed_at", current_timestamp())

    # Đếm số lượng để log
    row_count = gold_df.count()

    # 3. Ghi ra Gold Layer
    logger.info(f"Ghi Gold Product Metrics tới: {gold_metrics_path}")
    (
        gold_df.write
        .format("parquet")
        .mode("overwrite")
        .save(gold_metrics_path)
    )
    logger.success(f"✅ Đã ghi Gold Product Metrics ({row_count} rows)")
    
    spark.stop()

if __name__ == "__main__":
    create_product_metrics()
