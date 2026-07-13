"""
CLI Entry Point — Chạy scraper từ command line.

Usage:
    # Scrape 1 keyword
    python -m ingestion.cli scrape --keyword "bàn phím cơ" --pages 2

    # Scrape nhiều keywords từ file
    python -m ingestion.cli scrape --keywords-file keywords.txt --pages 1

    # Hiện thông tin settings
    python -m ingestion.cli info
"""

import argparse
import sys
from pathlib import Path

from loguru import logger

from ingestion.config import get_settings


def setup_logging(log_level: str = "INFO", log_dir: str = "./logs") -> None:
    """Cấu hình loguru logging.

    Output:
        - Console: colored, human-readable
        - File: JSON format, rotated daily
    """
    # Remove default handler
    logger.remove()

    # Console handler — colored output
    logger.add(
        sys.stderr,
        level=log_level,
        format=(
            "<green>{time:HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{extra[platform]:>7}</cyan> | "
            "<level>{message}</level>"
        ),
        filter=lambda record: "platform" in record["extra"],
    )

    # Fallback console handler — for messages without platform
    logger.add(
        sys.stderr,
        level=log_level,
        format=(
            "<green>{time:HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<level>{message}</level>"
        ),
        filter=lambda record: "platform" not in record["extra"],
    )

    # File handler — JSON format, daily rotation
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    logger.add(
        log_path / "scraper_{time:YYYY-MM-DD}.log",
        level="DEBUG",
        rotation="1 day",
        retention="7 days",
        encoding="utf-8",
        serialize=True,  # JSON format
    )


def cmd_scrape(args: argparse.Namespace) -> None:
    """Thực thi lệnh scrape — với checkpoint sau mỗi keyword."""
    import json
    from datetime import datetime, timezone

    from ingestion.scrapers.shopee_scraper import ShopeeScraper
    from ingestion.writers.jsonl_writer import JsonlWriter

    settings = get_settings()

    # Determine keywords
    keywords: list[str] = []
    if args.keyword:
        keywords = [args.keyword]
    elif args.keywords_file:
        kf = Path(args.keywords_file)
        if not kf.exists():
            logger.error(f"❌ File không tồn tại: {kf}")
            sys.exit(1)
        keywords = [
            line.strip()
            for line in kf.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
    if not keywords:
        # Nhập tương tác nếu không cung cấp flag
        try:
            kw_input = input("👉 Nhập từ khóa tìm kiếm (VD: 'chuột máy tính'): ").strip()
            if kw_input:
                keywords = [kw_input]
            else:
                logger.error("❌ Không có keyword nào để scrape")
                sys.exit(1)
        except KeyboardInterrupt:
            print("\nĐã hủy.")
            sys.exit(0)

    max_pages = args.pages or settings.MAX_PAGES_PER_KEYWORD

    logger.info(f"🚀 Bắt đầu scrape {len(keywords)} keywords, max {max_pages} pages/keyword")

    # Init writers
    product_writer = JsonlWriter(base_dir=settings.RAW_DATA_DIR, data_type="products")
    review_writer = JsonlWriter(base_dir=settings.RAW_DATA_DIR, data_type="reviews") if args.with_reviews else None

    max_reviews = args.max_reviews if args.max_reviews else settings.MAX_REVIEWS_PER_PRODUCT

    # === Crawl report tracking ===
    crawl_report = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "keywords_total": len(keywords),
        "keywords_completed": [],
        "keywords_failed": [],
        "total_products": 0,
        "total_reviews": 0,
    }

    # Run scraper with checkpoint after each keyword
    with ShopeeScraper() as scraper:
        for i, kw in enumerate(keywords, 1):
            logger.info(f"📋 [{i}/{len(keywords)}] Keyword: '{kw}'")
            kw_start = datetime.now(timezone.utc)
            kw_products = 0
            kw_reviews = 0

            try:
                if args.with_reviews:
                    products, reviews = scraper.scrape_products_with_reviews(
                        kw, max_pages=max_pages, max_reviews=max_reviews
                    )
                    if reviews:
                        rev_path = review_writer.write(reviews, keyword=f"{kw}_reviews")
                        logger.success(f"📁 Reviews checkpoint saved: {rev_path}")
                        kw_reviews = len(reviews)
                else:
                    products = scraper.scrape_products(kw, max_pages=max_pages)

                # === CHECKPOINT: Ghi ngay sau mỗi keyword ===
                if products:
                    output_path = product_writer.write(products, keyword=kw)
                    kw_products = len(products)
                    logger.success(
                        f"💾 Checkpoint saved: {kw_products} products → {output_path}"
                    )
                else:
                    logger.warning(f"⚠️ Không thu thập được sản phẩm nào cho '{kw}'")

                crawl_report["keywords_completed"].append({
                    "keyword": kw,
                    "products": kw_products,
                    "reviews": kw_reviews,
                    "duration_seconds": round(
                        (datetime.now(timezone.utc) - kw_start).total_seconds(), 1
                    ),
                })
                crawl_report["total_products"] += kw_products
                crawl_report["total_reviews"] += kw_reviews

            except Exception as e:
                logger.error(f"❌ Lỗi nghiêm trọng khi cào keyword '{kw}': {e}")
                crawl_report["keywords_failed"].append({
                    "keyword": kw,
                    "error": str(e),
                })
                # Tiếp tục keyword tiếp theo thay vì crash toàn bộ
                continue

    # === Ghi crawl report ===
    crawl_report["finished_at"] = datetime.now(timezone.utc).isoformat()
    crawl_report["status"] = (
        "completed" if not crawl_report["keywords_failed"]
        else "partial" if crawl_report["keywords_completed"]
        else "failed"
    )

    report_dir = Path(settings.DATA_DIR) / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / f"crawl_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    report_file.write_text(
        json.dumps(crawl_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Log summary
    logger.info("━" * 50)
    logger.info("📊 CRAWL REPORT SUMMARY")
    logger.info(f"   Status:     {crawl_report['status'].upper()}")
    logger.info(f"   Completed:  {len(crawl_report['keywords_completed'])}/{len(keywords)} keywords")
    logger.info(f"   Products:   {crawl_report['total_products']}")
    logger.info(f"   Reviews:    {crawl_report['total_reviews']}")
    if crawl_report["keywords_failed"]:
        logger.warning(f"   Failed:     {[kf['keyword'] for kf in crawl_report['keywords_failed']]}")
    logger.info(f"   Report:     {report_file}")
    logger.info("━" * 50)

    logger.info("🏁 Hoàn tất!")


def cmd_info(args: argparse.Namespace) -> None:
    """Hiện thông tin settings."""
    settings = get_settings()
    print("\n📋 Current Settings:")
    print(f"  Chrome CDP URL:    {settings.CHROME_CDP_URL}")
    print(f"  Request Delay:     {settings.REQUEST_DELAY_SECONDS}s")
    print(f"  Max Pages/Keyword: {settings.MAX_PAGES_PER_KEYWORD}")
    print(f"  Data Directory:    {settings.RAW_DATA_DIR}")
    print(f"  Log Level:         {settings.LOG_LEVEL}")
    print(f"  Log Directory:     {settings.LOG_DIR}")
    print()


def main():
    parser = argparse.ArgumentParser(
        prog="ingestion",
        description="🛒 Vietnam E-Commerce Data Ingestion Tool",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # === scrape command ===
    scrape_parser = subparsers.add_parser("scrape", help="Scrape sản phẩm từ Shopee")
    scrape_parser.add_argument(
        "--keyword", "-k",
        type=str,
        help="Keyword tìm kiếm (VD: 'bàn phím cơ')",
    )
    scrape_parser.add_argument(
        "--keywords-file", "-f",
        type=str,
        help="File chứa danh sách keywords (1 keyword/dòng)",
    )
    scrape_parser.add_argument(
        "--pages", "-p",
        type=int,
        default=None,
        help="Số trang tối đa per keyword (default: from settings)",
    )
    scrape_parser.add_argument(
        "--with-reviews",
        action="store_true",
        help="Cào thêm đánh giá (reviews) cho từng sản phẩm",
    )
    scrape_parser.add_argument(
        "--max-reviews",
        type=int,
        default=None,
        help="Số đánh giá tối đa mỗi sản phẩm (default: from settings)",
    )
    scrape_parser.set_defaults(func=cmd_scrape)

    # === info command ===
    info_parser = subparsers.add_parser("info", help="Hiện thông tin settings")
    info_parser.set_defaults(func=cmd_info)

    # Parse
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    # Setup logging
    settings = get_settings()
    setup_logging(log_level=settings.LOG_LEVEL, log_dir=settings.LOG_DIR)

    # Execute command
    args.func(args)


if __name__ == "__main__":
    main()
