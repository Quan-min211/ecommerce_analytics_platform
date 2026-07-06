"""
Script kiểm tra dữ liệu Gold Layer.
Đọc bảng product_metrics và in ra top 5 sản phẩm có nhiều lượt đánh giá nhất.
"""

import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from processing.utils.spark_session import get_spark_session

def verify_gold_data():
    spark = get_spark_session("VerifyGoldData")
    
    gold_metrics_path = str(project_root / "data" / "gold" / "product_metrics")
    
    print("\n--- ĐANG ĐỌC DỮ LIỆU TỪ GOLD LAYER ---")
    df = spark.read.format("parquet").load(gold_metrics_path)
    
    print("\n--- TOP 5 SẢN PHẨM NHIỀU ĐÁNH GIÁ NHẤT ---")
    df.orderBy(df["total_reviews"].desc()).select(
        "product_id", 
        "name", 
        "price", 
        "total_reviews", 
        "avg_rating", 
        "star_5_percentage"
    ).show(5, truncate=30)
    
    spark.stop()

if __name__ == "__main__":
    verify_gold_data()
