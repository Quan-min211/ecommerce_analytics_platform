"""
ML/NLP Topic Modeling — Trích xuất chủ đề từ các đánh giá tiêu cực.

Đọc Gold Sentiment (Parquet) bằng pandas, lọc review tiêu cực.
Sử dụng scikit-learn CountVectorizer để tìm n-grams (cụm 2-3 từ) xuất hiện nhiều nhất.
Lưu kết quả (topics & counts) ra file Parquet.

Chạy: python -m ml.topic_modeling
"""

from pathlib import Path

import pandas as pd
from loguru import logger
from sklearn.feature_extraction.text import CountVectorizer

project_root = Path(__file__).resolve().parent.parent

# Paths
GOLD_SENTIMENT_PATH = project_root / "data" / "gold" / "reviews_sentiment"
GOLD_TOPICS_PATH = project_root / "data" / "gold" / "negative_topics"

# Stopwords tiếng Việt cơ bản để loại bỏ các từ vô nghĩa
VIETNAMESE_STOPWORDS = [
    "là", "thì", "mà", "có", "không", "rất", "quá", "nhưng", "và", "của", "cho", 
    "những", "các", "một", "như", "với", "được", "bị", "sẽ", "đã", "đang", "cũng",
    "còn", "nên", "ra", "lại", "này", "kia", "đó", "đây", "ấy", "vậy", "rồi", 
    "nữa", "hơi", "lắm", "thế", "nào", "mới", "thấy", "hàng", "sản_phẩm", "shop", "mua",
    "giao", "nhận", "sp", "người", "khi", "trong", "ngoài", "về", "làm", "nhé", "nha", "ạ",
    "mình", "bạn", "tôi", "em", "anh", "chị"
]

def run_topic_modeling():
    logger.info("🔍 Bắt đầu trích xuất chủ đề (Topic Modeling) từ đánh giá tiêu cực...")

    # 1. Đọc Gold Sentiment
    parquet_files = list(GOLD_SENTIMENT_PATH.glob("*.parquet"))
    if not parquet_files:
        logger.error(f"Không tìm thấy file Parquet tại: {GOLD_SENTIMENT_PATH}")
        return

    dfs = [pd.read_parquet(f) for f in parquet_files]
    df = pd.concat(dfs, ignore_index=True)
    logger.info(f"📄 Đã đọc {len(df)} reviews từ Gold Sentiment")

    # 2. Lọc review tiêu cực
    if "sentiment_label" not in df.columns:
        logger.error("Không tìm thấy cột 'sentiment_label'. Bạn đã chạy sentiment_analysis chưa?")
        return

    negative_reviews = df[df["sentiment_label"] == "negative"]
    logger.info(f"   Tìm thấy {len(negative_reviews)} đánh giá tiêu cực.")

    if len(negative_reviews) == 0:
        logger.warning("Không có đánh giá tiêu cực nào để phân tích.")
        return

    # Tìm cột text
    text_col = None
    for col_name in ["review_text", "comment", "content", "text"]:
        if col_name in df.columns:
            text_col = col_name
            break

    if text_col is None:
        logger.error("Không tìm thấy cột chứa nội dung review.")
        return

    # Làm sạch text đơn giản (chuyển chữ thường, bỏ khoảng trắng thừa)
    texts = negative_reviews[text_col].dropna().astype(str).str.lower().str.strip()

    # 3. Trích xuất n-grams bằng CountVectorizer
    logger.info("   Đang trích xuất các cụm 2-3 từ (n-grams)...")
    
    try:
        # Sử dụng ngram_range=(2, 3) để lấy cụm 2 hoặc 3 từ (vd: "giao hàng chậm", "chất lượng kém")
        vectorizer = CountVectorizer(
            ngram_range=(2, 3),
            stop_words=VIETNAMESE_STOPWORDS,
            min_df=2, # Xuất hiện ít nhất 2 lần
            max_features=100 # Lấy top 100 cụm từ
        )
        
        X = vectorizer.fit_transform(texts)
        
        # Tính tổng số lần xuất hiện của mỗi cụm từ
        word_counts = X.sum(axis=0).A1
        words = vectorizer.get_feature_names_out()
        
        # 4. Tạo DataFrame kết quả
        topics_df = pd.DataFrame({"topic": words, "count": word_counts})
        topics_df = topics_df.sort_values(by="count", ascending=False).head(20) # Lấy top 20
        
        logger.info("📊 Top 5 phàn nàn phổ biến nhất:")
        for idx, row in topics_df.head(5).iterrows():
            logger.info(f"   - {row['topic']}: {row['count']} lần")
            
        # 5. Lưu ra file Parquet
        GOLD_TOPICS_PATH.mkdir(parents=True, exist_ok=True)
        output_file = GOLD_TOPICS_PATH / "topics.parquet"
        topics_df.to_parquet(output_file, index=False)
        logger.success(f"✅ Đã lưu top 20 chủ đề tại: {output_file}")
        
    except Exception as e:
        logger.error(f"Lỗi khi trích xuất chủ đề: {e}")
        # Nếu quá ít dữ liệu hoặc không extract được n-grams
        pass

if __name__ == "__main__":
    run_topic_modeling()
