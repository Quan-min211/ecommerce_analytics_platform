"""
FastAPI Backend — Vietnam E-Commerce Analytics Platform.

Entry point cho API server. Đọc dữ liệu từ Gold Layer (Parquet)
bằng pandas khi khởi động, phục vụ qua REST API.
"""

import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from prometheus_fastapi_instrumentator import Instrumentator

from backend.app.models.schemas import HealthResponse
from backend.app.routers import analytics, products
from backend.app.services.data_service import data_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load dữ liệu vào memory khi server khởi động."""
    logger.info("🚀 Đang khởi động Backend API...")
    data_service.load_data()
    logger.success("✅ Server sẵn sàng phục vụ!")
    yield
    logger.info("👋 Server đang tắt...")


app = FastAPI(
    title="🛒 Vietnam E-Commerce Analytics API",
    description=(
        "REST API phục vụ dữ liệu phân tích thương mại điện tử Việt Nam.\n\n"
        "Dữ liệu được thu thập từ Shopee, xử lý qua pipeline "
        "Bronze → Silver → Gold (Delta Lake), và phục vụ qua API này."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — cho phép frontend (Next.js) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(products.router)
app.include_router(analytics.router)

# Prometheus Metrics
Instrumentator().instrument(app).expose(app)


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Kiểm tra trạng thái server và dữ liệu."""
    return HealthResponse(
        status="healthy",
        total_products=len(data_service.df_product_metrics),
        total_reviews=len(data_service.df_reviews),
    )


@app.post("/api/reload", tags=["System"])
async def reload_data():
    """Reload dữ liệu từ Gold Layer (gọi sau khi ETL pipeline chạy xong)."""
    data_service.reload_data()
    return {"status": "reloaded", "total_products": len(data_service.df_product_metrics)}


# === Global Exception Handlers ===

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Trả về lỗi validation dạng JSON có cấu trúc rõ ràng."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error.get("loc", [])),
            "message": error.get("msg", ""),
            "type": error.get("type", ""),
        })
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "detail": errors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Bắt tất cả lỗi không xử lý được và trả về 500 có error_id."""
    error_id = str(uuid.uuid4())[:8]
    logger.error(f"[{error_id}] Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "error_id": error_id,
            "message": "Có lỗi xảy ra phía server. Vui lòng thử lại sau.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
