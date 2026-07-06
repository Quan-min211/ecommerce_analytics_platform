"""
Gold Layer: product price history and suspicious discount indicators.

This job preserves product snapshots over time so the dashboard can answer
questions such as: "Did this product increase before a campaign and then drop
on sale day?"
"""

import sys
from pathlib import Path

from loguru import logger
from pyspark.sql.functions import (
    abs as spark_abs,
    col,
    current_timestamp,
    datediff,
    lag,
    round as spark_round,
    to_date,
    when,
)
from pyspark.sql.window import Window

project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from processing.utils.spark_session import get_spark_session


def create_price_history():
    """Build Gold price history from Silver product snapshots."""
    spark = get_spark_session("GoldPriceHistory")

    silver_products_path = str(project_root / "data" / "silver" / "products")
    gold_price_history_path = str(project_root / "data" / "gold" / "price_history")

    logger.info(f"Reading Silver Products from: {silver_products_path}")
    try:
        df_products = spark.read.format("delta").load(silver_products_path)
    except Exception as e:
        logger.error(f"Cannot read Silver products: {e}")
        return

    if "scraped_at" not in df_products.columns:
        logger.error("Silver products does not contain scraped_at; cannot build price history.")
        return

    snapshot_df = (
        df_products
        .withColumn("scraped_date", to_date(col("scraped_at")))
        .dropDuplicates(["product_id", "scraped_at"])
    )

    price_window = Window.partitionBy("product_id").orderBy(col("scraped_at").asc())
    history_df = (
        snapshot_df
        .withColumn("previous_price", lag("price").over(price_window))
        .withColumn("previous_scraped_at", lag("scraped_at").over(price_window))
        .withColumn("price_change_abs", col("price") - col("previous_price"))
        .withColumn(
            "price_change_pct",
            when(
                col("previous_price").isNotNull() & (col("previous_price") > 0),
                spark_round((col("price") - col("previous_price")) / col("previous_price") * 100, 2),
            ),
        )
        .withColumn(
            "days_since_last_seen",
            when(
                col("previous_scraped_at").isNotNull(),
                datediff(col("scraped_at"), col("previous_scraped_at")),
            ),
        )
        .withColumn("is_price_increased", col("price_change_abs") > 0)
        .withColumn("is_price_decreased", col("price_change_abs") < 0)
        .withColumn(
            "is_discount_suspicious",
            when(
                (col("price_change_pct") <= -15)
                & col("previous_price").isNotNull()
                & (spark_abs(col("price_change_abs")) >= 20000),
                True,
            ).otherwise(False),
        )
        .withColumn("gold_processed_at", current_timestamp())
    )

    selected_columns = [
        "product_id",
        "shop_id",
        "name",
        "keyword",
        "price",
        "original_price",
        "discount_pct",
        "previous_price",
        "price_change_abs",
        "price_change_pct",
        "is_price_increased",
        "is_price_decreased",
        "is_discount_suspicious",
        "rating",
        "sold_count",
        "review_count",
        "scraped_at",
        "scraped_date",
        "days_since_last_seen",
        "gold_processed_at",
    ]
    available_columns = [c for c in selected_columns if c in history_df.columns]
    history_df = history_df.select(*available_columns)

    row_count = history_df.count()
    logger.info(f"Writing Gold Price History to: {gold_price_history_path}")
    (
        history_df.write
        .format("parquet")
        .mode("overwrite")
        .save(gold_price_history_path)
    )
    logger.success(f"Gold Price History written ({row_count} rows)")

    spark.stop()


if __name__ == "__main__":
    create_price_history()
