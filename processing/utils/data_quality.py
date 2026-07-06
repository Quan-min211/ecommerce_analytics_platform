"""
Data quality helpers for Silver layer checks.

The Silver layer is where raw-but-structured Bronze data becomes trusted data.
These helpers keep the governance rules close to the ETL jobs and persist
small JSON reports for monitoring, audit, and portfolio demos.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from loguru import logger
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, length, trim


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
QUALITY_DIR = PROJECT_ROOT / "data" / "quality"


def _write_report(entity: str, report: dict[str, Any]) -> Path:
    report_dir = QUALITY_DIR / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = report_dir / f"{entity}_dq_report_{run_id}.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(f"Data quality report written: {report_path}")
    return report_path


def _write_rejected(df: DataFrame, entity: str, reason: str) -> int:
    count = df.count()
    if count == 0:
        return 0

    output_path = QUALITY_DIR / "rejected" / entity / reason / datetime.now().strftime("%Y-%m-%d")
    (
        df.write
        .mode("overwrite")
        .format("parquet")
        .save(str(output_path))
    )
    logger.warning(f"Rejected {count} {entity} rows for {reason}: {output_path}")
    return count


def apply_product_quality_checks(df: DataFrame) -> tuple[DataFrame, dict[str, Any]]:
    """Filter invalid product rows and persist a governance report."""
    input_rows = df.count()

    invalid_price = df.filter(col("price").isNull() | (col("price") <= 0))
    missing_product_id = df.filter(col("product_id").isNull())
    missing_name = df.filter(col("name").isNull() | (length(trim(col("name"))) == 0))
    invalid_rating = (
        df.filter((col("rating").isNotNull()) & ((col("rating") < 0) | (col("rating") > 5)))
        if "rating" in df.columns
        else df.limit(0)
    )

    _write_rejected(invalid_price, "products", "invalid_price")
    _write_rejected(missing_product_id, "products", "missing_product_id")
    _write_rejected(missing_name, "products", "missing_name")
    _write_rejected(invalid_rating, "products", "invalid_rating")

    valid_df = df.filter(
        col("product_id").isNotNull()
        & col("price").isNotNull()
        & (col("price") > 0)
        & col("name").isNotNull()
        & (length(trim(col("name"))) > 0)
    )
    if "rating" in valid_df.columns:
        valid_df = valid_df.filter(
            col("rating").isNull() | ((col("rating") >= 0) & (col("rating") <= 5))
        )

    valid_rows = valid_df.count()
    report = {
        "entity": "products",
        "run_at": datetime.now().isoformat(),
        "input_rows": input_rows,
        "valid_rows": valid_rows,
        "rejected_rows": input_rows - valid_rows,
        "invalid_price": invalid_price.count(),
        "missing_product_id": missing_product_id.count(),
        "missing_name": missing_name.count(),
        "invalid_rating": invalid_rating.count(),
    }
    _write_report("products", report)
    return valid_df, report


def apply_review_quality_checks(df: DataFrame) -> tuple[DataFrame, dict[str, Any]]:
    """Filter invalid reviews and log reviews with missing text for ML governance."""
    input_rows = df.count()

    missing_review_id = df.filter(col("review_id").isNull())
    missing_product_id = df.filter(col("product_id").isNull())
    invalid_rating = df.filter(col("rating").isNull() | (col("rating") < 1) | (col("rating") > 5))
    missing_text = (
        df.filter(col("review_text").isNull() | (length(trim(col("review_text"))) == 0))
        if "review_text" in df.columns
        else df
    )

    _write_rejected(missing_review_id, "reviews", "missing_review_id")
    _write_rejected(missing_product_id, "reviews", "missing_product_id")
    _write_rejected(invalid_rating, "reviews", "invalid_rating")
    _write_rejected(missing_text, "reviews", "missing_text")

    valid_df = df.filter(
        col("review_id").isNotNull()
        & col("product_id").isNotNull()
        & col("rating").isNotNull()
        & (col("rating") >= 1)
        & (col("rating") <= 5)
    )

    valid_rows = valid_df.count()
    report = {
        "entity": "reviews",
        "run_at": datetime.now().isoformat(),
        "input_rows": input_rows,
        "valid_rows": valid_rows,
        "rejected_rows": input_rows - valid_rows,
        "missing_review_id": missing_review_id.count(),
        "missing_product_id": missing_product_id.count(),
        "invalid_rating": invalid_rating.count(),
        "missing_text": missing_text.count(),
    }
    _write_report("reviews", report)
    return valid_df, report
