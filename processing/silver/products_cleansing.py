"""
Lớp Silver: Đọc Products từ Bronze, làm sạch dữ liệu, drop duplicates và ghi vào Silver.
"""

import sys
from pathlib import Path
from loguru import logger
from pyspark.sql.functions import col, to_timestamp, current_timestamp, coalesce, lit
from pyspark.sql.types import IntegerType

project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from processing.utils.spark_session import get_spark_session
from processing.utils.data_quality import apply_product_quality_checks


def clean_products():
    spark = get_spark_session("SilverProductsCleansing")
    
    bronze_path = str(project_root / "data" / "bronze" / "products")
    silver_path = str(project_root / "data" / "silver" / "products")
    
    logger.info(f"Đang đọc Bronze Products từ: {bronze_path}")
    try:
        df = spark.read.format("delta").load(bronze_path)
    except Exception as e:
        logger.error(f"Không thể đọc Bronze data: {e}")
        return

    # 1. Drop duplicates dựa trên product_id
    dedupe_keys = ["product_id", "scraped_at"] if "scraped_at" in df.columns else ["product_id"]
    df_clean = df.dropDuplicates(dedupe_keys)
    
    # 2. Xử lý các trường rỗng / chuẩn hóa kiểu
    # Ví dụ: đảm bảo price là số nguyên
    df_clean = df_clean.withColumn("price", col("price").cast(IntegerType()))
    
    # Xử lý discount null -> 0
    if "discount" in df_clean.columns:
        df_clean = df_clean.withColumn("discount", coalesce(col("discount"), lit("0%")))
        
    # Xử lý timestamp
    if "scraped_at" in df_clean.columns:
        df_clean = df_clean.withColumn("scraped_at", to_timestamp("scraped_at"))
        
    # Thêm timestamp processing_time
    df_clean = df_clean.withColumn("processed_at", current_timestamp())
    df_clean, dq_report = apply_product_quality_checks(df_clean)
    logger.info(f"Data Quality Products: {dq_report}")

    # Đếm trước khi ghi (tránh đọc lại Delta sau khi write)
    row_count = df_clean.count()

    # Ghi ra Silver
    logger.info(f"Ghi Silver Products tới: {silver_path}")
    (
        df_clean.write
        .format("delta")
        .mode("overwrite")
        .save(silver_path)
    )
    logger.success(f"✅ Đã ghi Silver Products ({row_count} rows)")
    
    spark.stop()

if __name__ == "__main__":
    clean_products()
