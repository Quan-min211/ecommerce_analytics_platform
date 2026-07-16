"""
Pydantic schemas cho API responses.
"""

from typing import Optional

from pydantic import BaseModel


class ProductResponse(BaseModel):
    """Schema cho 1 sản phẩm trong danh sách."""
    product_id: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    discount: Optional[str] = None
    sold_count: Optional[str] = None
    rating_star: Optional[float] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    shop_name: Optional[str] = None
    location: Optional[str] = None

    # Metrics từ Gold Layer
    total_reviews: Optional[int] = 0
    avg_rating: Optional[float] = 0.0
    star_5_count: Optional[int] = 0
    star_4_count: Optional[int] = 0
    star_3_count: Optional[int] = 0
    star_2_count: Optional[int] = 0
    star_1_count: Optional[int] = 0
    star_5_percentage: Optional[float] = 0.0

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    """Schema cho response có phân trang."""
    data: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int


class AnalyticsOverview(BaseModel):
    """Schema cho tổng quan analytics."""
    total_products: int
    avg_price: float
    avg_rating: float
    total_reviews: int
    total_keywords: Optional[int] = 0


class RatingDistribution(BaseModel):
    """Schema cho phân bố đánh giá."""
    star_1: int
    star_2: int
    star_3: int
    star_4: int
    star_5: int
    total: int


class HealthResponse(BaseModel):
    """Schema cho health check."""
    status: str
    total_products: int
    total_reviews: int


class SentimentOverview(BaseModel):
    """Schema cho sentiment phân tích."""
    positive: int = 0
    negative: int = 0
    neutral: int = 0
    total: int = 0
    positive_pct: float = 0.0
    negative_pct: float = 0.0
    neutral_pct: float = 0.0


class KeywordStat(BaseModel):
    """Thống kê theo từng keyword."""
    keyword: str
    total_products: int = 0
    avg_price: float = 0.0
    avg_rating: float = 0.0
    total_reviews: int = 0
    rating_distribution: Optional[dict] = None


class NegativeTopic(BaseModel):
    """Một chủ đề phàn nàn từ topic modeling."""
    topic: str
    count: int = 0


class PriceVolatilityItem(BaseModel):
    """Snapshot biến động giá."""
    product_id: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    price_change_pct: Optional[float] = None
    is_discount_suspicious: Optional[bool] = None
    scraped_at: Optional[str] = None

    class Config:
        extra = "allow"  # Gold layer có thể có thêm cột


class DatasetStatus(BaseModel):
    """Trạng thái một dataset."""
    rows: int = 0
    available: bool = False


class DataStatusResponse(BaseModel):
    """Response cho /data-status endpoint."""
    loaded_at: Optional[str] = None
    datasets: dict[str, DatasetStatus] = {}
