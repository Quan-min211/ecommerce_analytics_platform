"""
Unit tests cho Backend API — kiểm tra cấu trúc và logic cơ bản.
Không cần Parquet data thật, dùng mock data.
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd


# ==============================
# Test Config
# ==============================

class TestConfig:
    """Test backend config loads correctly."""

    def test_paths_exist(self):
        from backend.app.config import (
            PROJECT_ROOT,
            GOLD_PRODUCT_METRICS_PATH,
            GOLD_SENTIMENT_PATH,
            SILVER_REVIEWS_PATH,
        )
        assert PROJECT_ROOT.exists()
        assert str(GOLD_PRODUCT_METRICS_PATH).endswith("product_metrics")
        assert str(GOLD_SENTIMENT_PATH).endswith("reviews_sentiment")
        assert str(SILVER_REVIEWS_PATH).endswith("reviews")

    def test_pagination_defaults(self):
        from backend.app.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
        assert DEFAULT_PAGE_SIZE == 20
        assert MAX_PAGE_SIZE == 100


# ==============================
# Test Schemas
# ==============================

class TestSchemas:
    """Test Pydantic models validate correctly."""

    def test_health_response(self):
        from backend.app.models.schemas import HealthResponse
        resp = HealthResponse(status="healthy", total_products=10, total_reviews=50)
        assert resp.status == "healthy"
        assert resp.total_products == 10

    def test_analytics_overview(self):
        from backend.app.models.schemas import AnalyticsOverview
        ov = AnalyticsOverview(
            total_products=100, avg_price=50000, avg_rating=4.5, total_reviews=200
        )
        assert ov.avg_rating == 4.5

    def test_paginated_response(self):
        from backend.app.models.schemas import PaginatedResponse
        pr = PaginatedResponse(
            data=[{"id": 1}], total=1, page=1, page_size=20, total_pages=1
        )
        assert pr.total_pages == 1


# ==============================
# Test DataService
# ==============================

class TestDataService:
    """Test DataService logic with mock data."""

    @pytest.fixture
    def mock_service(self):
        """Create a DataService with mock data (no Parquet files needed)."""
        from backend.app.services.data_service import DataService

        # Reset singleton
        DataService._instance = None
        service = DataService()

        # Mock product metrics
        service.df_product_metrics = pd.DataFrame([
            {
                "product_id": "P001", "name": "Test Product A", "price": 100000,
                "avg_rating": 4.5, "total_reviews": 10, "shop_name": "Shop A",
                "star_5_count": 5, "star_4_count": 3, "star_3_count": 1,
                "star_2_count": 1, "star_1_count": 0,
            },
            {
                "product_id": "P002", "name": "Test Product B", "price": 200000,
                "avg_rating": 3.8, "total_reviews": 5, "shop_name": "Shop B",
                "star_5_count": 2, "star_4_count": 1, "star_3_count": 1,
                "star_2_count": 0, "star_1_count": 1,
            },
        ])

        # Mock reviews
        service.df_reviews = pd.DataFrame([
            {"review_id": "R1", "product_id": "P001", "review_text": "Tốt lắm", "rating": 5},
            {"review_id": "R2", "product_id": "P001", "review_text": "Bình thường", "rating": 3},
        ])

        # Mock sentiment
        service.df_sentiment = pd.DataFrame([
            {"review_id": "R1", "product_id": "P001", "review_text": "Tốt lắm",
             "rating": 5, "sentiment_label": "positive", "sentiment_score": 1.0},
            {"review_id": "R2", "product_id": "P001", "review_text": "Bình thường",
             "rating": 3, "sentiment_label": "neutral", "sentiment_score": 0.0},
        ])

        service._loaded = True
        return service

    def test_get_overview(self, mock_service):
        overview = mock_service.get_overview()
        assert overview["total_products"] == 2
        assert overview["avg_rating"] > 0

    def test_get_products_pagination(self, mock_service):
        records, total = mock_service.get_products(page=1, page_size=1)
        assert len(records) == 1
        assert total == 2

    def test_get_products_search(self, mock_service):
        records, total = mock_service.get_products(search="Product A")
        assert total == 1
        assert records[0]["name"] == "Test Product A"

    def test_get_product_by_id(self, mock_service):
        product = mock_service.get_product_by_id("P001")
        assert product is not None
        assert product["name"] == "Test Product A"

    def test_get_product_by_id_not_found(self, mock_service):
        product = mock_service.get_product_by_id("NONEXISTENT")
        assert product is None

    def test_get_top_products(self, mock_service):
        top = mock_service.get_top_products(metric="avg_rating", limit=1)
        assert len(top) == 1
        assert top[0]["product_id"] == "P001"  # highest rating

    def test_get_reviews_by_product(self, mock_service):
        reviews = mock_service.get_reviews_by_product("P001")
        assert len(reviews) == 2
        # Should have sentiment labels (from df_sentiment)
        assert reviews[0].get("sentiment_label") is not None

    def test_get_sentiment_overview(self, mock_service):
        sentiment = mock_service.get_sentiment_overview()
        assert sentiment["total"] == 2
        assert sentiment["positive"] == 1
        assert sentiment["neutral"] == 1
        assert sentiment["negative"] == 0

    def test_get_rating_distribution(self, mock_service):
        dist = mock_service.get_rating_distribution()
        assert dist["star_5"] == 7  # 5 + 2
        assert dist["total"] > 0


# ==============================
# Test ML Module
# ==============================

class TestSentimentAnalysis:
    """Test ML sentiment analysis helper (without actually calling underthesea)."""

    def test_empty_text_returns_neutral(self):
        from ml.sentiment_analysis import analyze_sentiment
        result = analyze_sentiment("")
        assert result["sentiment_label"] == "neutral"
        assert result["sentiment_score"] == 0.0

    def test_none_text_returns_neutral(self):
        from ml.sentiment_analysis import analyze_sentiment
        result = analyze_sentiment(None)
        assert result["sentiment_label"] == "neutral"


# ==============================
# Test Reload Auth
# ==============================

class TestReloadAuth:
    """Test /api/reload endpoint authentication."""

    @pytest.fixture
    def client_with_key(self):
        """Create a TestClient with ADMIN_API_KEY set."""
        with patch("backend.app.main.ADMIN_API_KEY", "test-secret-key"):
            from backend.app.main import app
            from fastapi.testclient import TestClient
            yield TestClient(app)

    @pytest.fixture
    def client_no_key(self):
        """Create a TestClient without ADMIN_API_KEY (dev mode)."""
        with patch("backend.app.main.ADMIN_API_KEY", None):
            from backend.app.main import app
            from fastapi.testclient import TestClient
            yield TestClient(app)

    def test_reload_rejected_with_wrong_key(self, client_with_key):
        """Should return 403 when wrong API key is provided."""
        response = client_with_key.post(
            "/api/reload",
            headers={"X-Admin-Key": "wrong-key"},
        )
        assert response.status_code == 403

    def test_reload_rejected_without_key(self, client_with_key):
        """Should return 403 when no API key header is sent."""
        response = client_with_key.post("/api/reload")
        assert response.status_code == 403

    def test_reload_success_with_correct_key(self, client_with_key):
        """Should succeed when correct API key is provided."""
        response = client_with_key.post(
            "/api/reload",
            headers={"X-Admin-Key": "test-secret-key"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "reloaded"

    def test_reload_success_without_auth_in_dev(self, client_no_key):
        """Should succeed without auth when ADMIN_API_KEY is not set."""
        response = client_no_key.post("/api/reload")
        assert response.status_code == 200
        assert response.json()["status"] == "reloaded"
