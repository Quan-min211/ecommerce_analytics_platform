import os
import sys
import time
import subprocess
from pathlib import Path
from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import requests

# Thêm root_dir vào sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from ingestion.scrapers.shopee_scraper import ShopeeScraper
from ingestion.writers.jsonl_writer import JsonlWriter
from ingestion.config import get_settings
from processing.bronze.json_to_bronze import run_bronze_ingestion
from processing.silver.products_cleansing import clean_products
from processing.silver.reviews_cleansing import clean_reviews
from processing.gold.product_metrics import create_product_metrics
from processing.gold.price_history import create_price_history
from ml.sentiment_analysis import run_sentiment_analysis
from ml.topic_modeling import run_topic_modeling

app = FastAPI(title="Local Crawler Agent", port=8001)

# Cho phép Next.js frontend (cổng 3000) gọi API này
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CrawlRequest(BaseModel):
    keyword: str
    limit: int = 100

def run_etl_pipeline():
    """Chạy toàn bộ pipeline ETL và ML."""
    logger.info("🚀 Bắt đầu chạy ETL Pipeline...")
    try:
        logger.info("==> Running Bronze Ingestion...")
        run_bronze_ingestion()
        
        logger.info("==> Running Silver Cleansing (Products)...")
        clean_products()
        
        logger.info("==> Running Silver Cleansing (Reviews)...")
        clean_reviews()
        
        logger.info("==> Running Gold Transformation...")
        create_product_metrics()

        logger.info("==> Running Gold Price History...")
        create_price_history()
        
        logger.info("==> Running Sentiment Analysis...")
        run_sentiment_analysis()

        logger.info("==> Running Negative Topic Modeling...")
        run_topic_modeling()
        
        logger.info("✅ ETL Pipeline hoàn tất.")
    except Exception as e:
        logger.error(f"❌ ETL Pipeline thất bại: {e}")
        raise e

def reload_backend():
    """Gọi API reload của Docker Backend."""
    logger.info("🔄 Đang yêu cầu Backend reload dữ liệu...")
    try:
        res = requests.post("http://localhost:8000/api/reload")
        if res.status_code == 200:
            logger.success("✅ Backend đã reload thành công!")
        else:
            logger.error(f"❌ Backend reload thất bại: {res.status_code} - {res.text}")
    except Exception as e:
        logger.error(f"❌ Lỗi khi kết nối tới Backend: {e}")

def _open_chrome_cdp():
    """Tự động mở Chrome với chế độ Remote Debugging trên Windows."""
    import shutil
    chrome_path = shutil.which("chrome")
    if not chrome_path:
        # Đường dẫn mặc định của Chrome trên Windows
        possible_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        ]
        for p in possible_paths:
            if os.path.exists(p):
                chrome_path = p
                break
    
    if not chrome_path:
        logger.error("❌ Không tìm thấy trình duyệt Chrome trên máy!")
        return False
        
    try:
        # Kiểm tra port 9222 có đang mở không
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', 9222)) == 0:
                logger.info("✅ Chrome CDP (9222) đã mở.")
                return True
                
        logger.info(f"🚀 Mở Chrome tại {chrome_path}...")
        # Sử dụng một thư mục user data CỐ ĐỊNH trong project để lưu trạng thái đăng nhập
        user_data_dir = os.path.join(project_root, "chrome_bot_profile")
        os.makedirs(user_data_dir, exist_ok=True)
        
        subprocess.Popen([
            chrome_path, 
            "--remote-debugging-port=9222",
            f"--user-data-dir={user_data_dir}",
            "--no-first-run",
            "--no-default-browser-check"
        ])
        
        # Chờ tối đa 60 giây để Chrome khởi động và sẵn sàng
        logger.info("⏳ Đang chờ trình duyệt Chrome khởi tạo...")
        for _ in range(60):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex(('127.0.0.1', 9222)) == 0:
                    logger.info("✅ Chrome CDP đã sẵn sàng!")
                    time.sleep(2) # Đợi thêm 2s cho trình duyệt load hẳn UI
                    return True
            time.sleep(1)
            
        logger.error("❌ Quá thời gian chờ Chrome mở (60s)!")
        return False
    except Exception as e:
        logger.error(f"❌ Không thể mở Chrome: {e}")
        return False

def do_crawl_task(keyword: str, limit: int):
    """Task cào dữ liệu chạy ngầm."""
    logger.info(f"🔍 Bắt đầu cào dữ liệu: {keyword} (Giới hạn {limit} sản phẩm)")
    
    # 1. Đảm bảo Chrome đang mở
    if not _open_chrome_cdp():
        return
        
    # 2. Cào dữ liệu bằng ShopeeScraper
    settings = get_settings()
    product_writer = JsonlWriter(base_dir=settings.RAW_DATA_DIR, data_type="products")
    review_writer = JsonlWriter(base_dir=settings.RAW_DATA_DIR, data_type="reviews")
    
    # Tính toán số trang (Shopee có ~60 SP/trang)
    max_pages = max(1, limit // 60 + (1 if limit % 60 > 0 else 0))
    
    try:
        with ShopeeScraper() as scraper:
            products, reviews = scraper.scrape_products_with_reviews(
                keyword, max_pages=max_pages, max_reviews=50
            )
            
            # Cắt bớt sản phẩm dư
            if len(products) > limit:
                products = products[:limit]
            
            if products:
                product_writer.write(products, keyword=keyword)
            if reviews:
                review_writer.write(reviews, keyword=f"{keyword}_reviews")
                
            logger.success(f"✅ Đã lưu {len(products)} sản phẩm và {len(reviews)} đánh giá.")
    except Exception as e:
        logger.error(f"❌ Có lỗi trong quá trình cào: {e}. Hệ thống vẫn sẽ lưu những dữ liệu đã cào được...")
        # Xóa lệnh `return` ở đây để nó tiếp tục chạy ETL Pipeline phía dưới
        
    # 3. Chạy ETL Pipeline
    run_etl_pipeline()
    
    # 4. Báo Backend reload data
    reload_backend()

@app.post("/api/crawl")
async def start_crawl(req: CrawlRequest, background_tasks: BackgroundTasks):
    """Kích hoạt tiến trình cào dữ liệu tự động."""
    background_tasks.add_task(do_crawl_task, req.keyword, req.limit)
    return {
        "status": "success",
        "message": f"Đã bắt đầu cào {req.limit} sản phẩm '{req.keyword}' và xử lý ngầm. Quá trình có thể mất vài phút."
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Khởi động Local Crawler Agent (Cổng 8001)...")
    uvicorn.run("crawler_agent:app", host="0.0.0.0", port=8001, reload=True)
