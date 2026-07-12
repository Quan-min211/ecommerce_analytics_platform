"""
Router cho Analytics API.
Endpoints: GET /api/analytics/overview, /top-products, /rating-distribution
"""

from typing import Optional

from fastapi import APIRouter, Query, Response

from backend.app.models.schemas import AnalyticsOverview, RatingDistribution
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview, summary="Tổng quan thống kê")
async def get_overview(
    response: Response,
    keyword: Optional[str] = Query(None, description="Lọc theo từ khóa đã cào"),
    min_price: Optional[float] = Query(None, ge=0, description="Giá tối thiểu"),
    max_price: Optional[float] = Query(None, ge=0, description="Giá tối đa"),
):
    """
    Trả về các chỉ số tổng quan (có thể lọc theo keyword và khoảng giá).
    Cache 2 phút — dữ liệu ít thay đổi.
    """
    response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=60"
    return data_service.get_overview(
        keyword=keyword, min_price=min_price, max_price=max_price,
    )


@router.get("/top-products", summary="Top sản phẩm")
async def get_top_products(
    response: Response,
    metric: str = Query(
        "avg_rating",
        description="Xếp hạng theo: avg_rating, total_reviews, sold_count"
    ),
    limit: int = Query(10, ge=1, le=50, description="Số lượng sản phẩm trả về"),
    keyword: Optional[str] = Query(None, description="Lọc theo từ khóa"),
    min_price: Optional[float] = Query(None, ge=0, description="Giá tối thiểu"),
    max_price: Optional[float] = Query(None, ge=0, description="Giá tối đa"),
):
    """
    Top N sản phẩm theo metric (có thể lọc theo keyword và khoảng giá).
    Cache 2 phút — dữ liệu ít thay đổi.
    """
    response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=60"
    return data_service.get_top_products(
        metric=metric, limit=limit,
        keyword=keyword, min_price=min_price, max_price=max_price,
    )


@router.get(
    "/rating-distribution",
    response_model=RatingDistribution,
    summary="Phân bố đánh giá"
)
async def get_rating_distribution(response: Response):
    """
    Phân bố đánh giá theo số sao (1-5) trên toàn bộ sản phẩm.
    Cache 10 phút — dữ liệu tĩnh, ít thay đổi.
    """
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=120"
    return data_service.get_rating_distribution()


@router.get("/sentiment-overview", summary="Tổng quan cảm xúc")
async def get_sentiment_overview(response: Response):
    """
    Thống kê cảm xúc review (NLP Sentiment Analysis).
    Cache 5 phút — chỉ thay đổi sau khi chạy lại ML pipeline.
    """
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=60"
    return data_service.get_sentiment_overview()


@router.get("/keyword-stats", summary="Thống kê theo từ khóa")
async def get_keyword_stats(response: Response):
    """
    Thống kê chi tiết cho từng từ khóa đã cào.
    Cache 5 phút — chỉ thay đổi sau khi có lượt cào dữ liệu mới.
    """
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=60"
    return data_service.get_keyword_stats()


@router.get("/negative-topics", summary="Chủ đề đánh giá tiêu cực")
async def get_negative_topics(response: Response):
    """
    Top cụm từ phàn nàn nhiều nhất (NLP Topic Modeling).
    Cache 10 phút — chỉ thay đổi sau khi chạy lại topic_modeling.py.
    """
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=120"
    return data_service.get_negative_topics()


@router.get("/price-history/{product_id}", summary="Lịch sử giá sản phẩm")
async def get_price_history(product_id: str):
    """
    Trả về lịch sử giá của một sản phẩm từ Gold price_history.
    Dùng để phát hiện tăng giá trước campaign hoặc giảm giá bất thường.
    """
    return {
        "product_id": product_id,
        "history": data_service.get_price_history_by_product(product_id),
    }


@router.get("/price-volatility", summary="Sản phẩm biến động giá mạnh")
async def get_price_volatility(
    limit: int = Query(20, ge=1, le=100, description="Số lượng snapshot trả về"),
    suspicious_only: bool = Query(False, description="Chỉ lấy snapshot có dấu hiệu giảm giá đáng nghi"),
):
    """
    Trả về các snapshot có biến động giá mạnh nhất.
    Nếu suspicious_only=true, chỉ trả về các case giảm giá sâu đáng nghi.
    """
    return data_service.get_price_volatility(limit=limit, suspicious_only=suspicious_only)
