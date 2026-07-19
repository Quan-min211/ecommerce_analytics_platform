"""
Cấu hình cho Backend API.
"""

import os
from pathlib import Path

# Đường dẫn gốc của project
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Đường dẫn tới các layer dữ liệu (Delta Lake lưu dưới dạng Parquet)
GOLD_PRODUCT_METRICS_PATH = PROJECT_ROOT / "data" / "gold" / "product_metrics"
GOLD_SENTIMENT_PATH = PROJECT_ROOT / "data" / "gold" / "reviews_sentiment"
GOLD_NEGATIVE_TOPICS_PATH = PROJECT_ROOT / "data" / "gold" / "negative_topics"
GOLD_PRICE_HISTORY_PATH = PROJECT_ROOT / "data" / "gold" / "price_history"
SILVER_PRODUCTS_PATH = PROJECT_ROOT / "data" / "silver" / "products"
SILVER_REVIEWS_PATH = PROJECT_ROOT / "data" / "silver" / "reviews"

# Server config
API_HOST = "0.0.0.0"
API_PORT = 8000
API_DEBUG = True

# Pagination defaults
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Security
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", None)

# CORS — comma-separated origins, defaults to localhost dev
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000",
    ).split(",")
    if origin.strip()
]
