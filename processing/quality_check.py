"""
Data Quality Check — Kiểm tra chất lượng dữ liệu qua từng layer (Bronze → Silver → Gold).

Chạy sau mỗi ETL pipeline để tạo báo cáo chất lượng:
    python -m processing.quality_check

Output: data/reports/quality_report_YYYYMMDD_HHMMSS.json
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from loguru import logger

project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))


# ─── Pandas-based checks (không cần Spark) ────────────────────────────────────


def _check_parquet_dir(directory: Path, label: str) -> dict:
    """Kiểm tra thư mục Parquet và trả về quality report dict."""
    import pandas as pd

    report = {
        "layer": label,
        "path": str(directory),
        "status": "missing",
        "row_count": 0,
        "column_count": 0,
        "null_rates": {},
        "duplicate_rate": 0.0,
        "issues": [],
    }

    parquet_files = list(directory.glob("**/*.parquet"))
    if not parquet_files:
        report["issues"].append(f"Không tìm thấy file .parquet trong {directory}")
        logger.warning(f"[{label}] Không có file Parquet — bỏ qua.")
        return report

    try:
        dfs = [pd.read_parquet(f) for f in parquet_files]
        df = pd.concat(dfs, ignore_index=True)
    except Exception as e:
        report["status"] = "error"
        report["issues"].append(f"Không thể đọc Parquet: {e}")
        logger.error(f"[{label}] Lỗi đọc: {e}")
        return report

    row_count = len(df)
    col_count = len(df.columns)

    # Null rate per column
    null_rates = {}
    for col in df.columns:
        null_pct = round(df[col].isna().mean() * 100, 2)
        null_rates[col] = null_pct
        if null_pct > 30:
            report["issues"].append(f"Cột '{col}' có {null_pct}% giá trị null")

    # Duplicate check
    dup_keys = _get_dup_keys(label, df.columns.tolist())
    if dup_keys:
        dup_count = int(df.duplicated(subset=dup_keys).sum())
        dup_rate = round(dup_count / row_count * 100, 2) if row_count > 0 else 0
        if dup_count > 0:
            report["issues"].append(
                f"{dup_count} rows trùng lặp ({dup_rate}%) theo key {dup_keys}"
            )
    else:
        dup_rate = 0.0

    # Price sanity check
    if "price" in df.columns:
        zero_price = int((df["price"] <= 0).sum())
        if zero_price > 0:
            report["issues"].append(f"{zero_price} sản phẩm có price <= 0")

    report.update({
        "status": "ok" if not report["issues"] else "warning",
        "row_count": row_count,
        "column_count": col_count,
        "null_rates": null_rates,
        "duplicate_rate": dup_rate,
    })

    status_icon = "✅" if report["status"] == "ok" else "⚠️"
    logger.info(
        f"{status_icon} [{label}] {row_count:,} rows | "
        f"{col_count} cols | "
        f"{len(report['issues'])} issues"
    )
    return report


def _get_dup_keys(label: str, columns: list[str]) -> list[str]:
    """Trả về primary key phù hợp với từng layer."""
    if "product_id" in columns and "scraped_at" in columns:
        return ["product_id", "scraped_at"]
    if "product_id" in columns:
        return ["product_id"]
    if "review_id" in columns:
        return ["review_id"]
    return []


# ─── Delta Lake checks (dùng Spark nếu có) ────────────────────────────────────


def _check_delta_dir(directory: Path, label: str) -> dict:
    """Kiểm tra Delta Lake table (đọc Parquet part-files bên trong)."""
    # Delta lưu data trong thư mục con, kiểm tra bằng cách đọc trực tiếp part files
    part_files = list(directory.glob("**/*.parquet"))
    if not part_files:
        # Thử đọc nested parts (Delta format)
        parts_dir = directory / "*.parquet"
        part_files = list(directory.rglob("*.parquet"))

    temp_dir = directory
    return _check_parquet_dir(temp_dir, label)


# ─── Main runner ──────────────────────────────────────────────────────────────


def run_quality_check() -> dict:
    """
    Chạy data quality check trên tất cả layers và xuất báo cáo JSON.

    Returns:
        dict: Full quality report
    """
    started_at = datetime.now()
    logger.info("🔍 Bắt đầu kiểm tra chất lượng dữ liệu...")

    data_dir = project_root / "data"

    layers = [
        # (path, label, reader_fn)
        (data_dir / "bronze" / "products",          "Bronze.Products",  _check_delta_dir),
        (data_dir / "bronze" / "reviews",           "Bronze.Reviews",   _check_delta_dir),
        (data_dir / "silver" / "products",          "Silver.Products",  _check_delta_dir),
        (data_dir / "silver" / "reviews",           "Silver.Reviews",   _check_delta_dir),
        (data_dir / "gold"   / "product_metrics",   "Gold.Metrics",     _check_parquet_dir),
        (data_dir / "gold"   / "price_history",     "Gold.PriceHistory", _check_parquet_dir),
        (data_dir / "gold"   / "reviews_sentiment", "Gold.Sentiment",   _check_parquet_dir),
        (data_dir / "gold"   / "negative_topics",   "Gold.Topics",      _check_parquet_dir),
    ]

    layer_reports = []
    total_issues = 0

    for path, label, checker in layers:
        report = checker(path, label)
        layer_reports.append(report)
        total_issues += len(report.get("issues", []))

    # Layer-to-layer row count comparison (drop rate)
    row_counts = {r["layer"]: r["row_count"] for r in layer_reports}
    funnel = {}
    pairs = [
        ("Bronze.Products", "Silver.Products"),
        ("Silver.Products", "Gold.Metrics"),
        ("Bronze.Reviews",  "Silver.Reviews"),
        ("Silver.Reviews",  "Gold.Sentiment"),
    ]
    for src, dst in pairs:
        src_count = row_counts.get(src, 0)
        dst_count = row_counts.get(dst, 0)
        if src_count > 0:
            drop_pct = round((1 - dst_count / src_count) * 100, 1)
            funnel[f"{src} → {dst}"] = {
                "src_rows": src_count,
                "dst_rows": dst_count,
                "drop_pct": drop_pct,
            }
            if drop_pct > 20:
                logger.warning(
                    f"⚠️  {src} → {dst}: drop {drop_pct}% "
                    f"({src_count:,} → {dst_count:,} rows)"
                )

    duration = round((datetime.now() - started_at).total_seconds(), 2)
    overall_status = "ok" if total_issues == 0 else "warning"

    report = {
        "generated_at": started_at.isoformat(),
        "duration_seconds": duration,
        "overall_status": overall_status,
        "total_issues": total_issues,
        "layer_funnel": funnel,
        "layers": layer_reports,
    }

    # Ghi report ra file JSON
    report_dir = data_dir / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / f"quality_report_{started_at.strftime('%Y%m%d_%H%M%S')}.json"
    report_file.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    logger.info("━" * 55)
    logger.info("📊 DATA QUALITY SUMMARY")
    logger.info(f"   Overall:     {overall_status.upper()}")
    logger.info(f"   Total Issues:{total_issues}")
    logger.info(f"   Duration:    {duration}s")
    logger.info(f"   Report:      {report_file}")
    logger.info("━" * 55)

    return report


if __name__ == "__main__":
    run_quality_check()
