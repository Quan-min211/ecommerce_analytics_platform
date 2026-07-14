"""
Data Service: Đọc dữ liệu từ Gold/Silver Layer (Parquet files) bằng pandas.
Hoàn toàn không cần Spark/JVM — khởi động nhanh, nhẹ, ổn định.
"""

from pathlib import Path

import pandas as pd
from loguru import logger

from backend.app.config import (
    GOLD_NEGATIVE_TOPICS_PATH,
    GOLD_PRICE_HISTORY_PATH,
    GOLD_PRODUCT_METRICS_PATH,
    GOLD_SENTIMENT_PATH,
)


class DataService:
    """
    Singleton service đọc dữ liệu từ Parquet files và cache trong memory.
    Gọi load_data() một lần khi server khởi động, sau đó dùng lại.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load_data(self):
        """Đọc tất cả Parquet files từ Gold Layer vào memory."""
        if self._loaded:
            return

        logger.info("Đang load dữ liệu từ Gold Layer...")

        # Đọc Gold Product Metrics
        self.df_product_metrics = self._read_parquet_dir(GOLD_PRODUCT_METRICS_PATH)
        logger.info(f"  → Product Metrics: {len(self.df_product_metrics)} rows")

        # Đọc Silver Reviews (để có chi tiết review)
        self.df_reviews = pd.DataFrame()

        # Đọc Gold Sentiment (nếu đã chạy ML pipeline)
        self.df_sentiment = self._read_parquet_dir(GOLD_SENTIMENT_PATH)
        if not self.df_sentiment.empty:
            logger.info(f"  → Sentiment: {len(self.df_sentiment)} rows")
        else:
            logger.warning("  ⚠ Chưa có dữ liệu sentiment. Chạy: python -m ml.sentiment_analysis")

        self.df_reviews = self.df_sentiment.copy()
        logger.info(f"  → Reviews: {len(self.df_reviews)} rows")

        # Đọc Negative Topics
        self.df_negative_topics = self._read_parquet_dir(GOLD_NEGATIVE_TOPICS_PATH)
        if not self.df_negative_topics.empty:
            logger.info(f"  → Negative Topics: {len(self.df_negative_topics)} topics")

        # Đọc Gold Price History cho phân tích time-series
        self.df_price_history = self._read_parquet_dir(GOLD_PRICE_HISTORY_PATH)
        if not self.df_price_history.empty:
            logger.info(f"  → Price History: {len(self.df_price_history)} snapshots")

        self._loaded = True
        logger.success("✅ Dữ liệu đã được load vào memory!")

    def reload_data(self):
        """Force reload dữ liệu (gọi sau khi ETL pipeline chạy xong)."""
        self._loaded = False
        self.load_data()

    def _read_parquet_dir(self, directory: Path) -> pd.DataFrame:
        """Đọc tất cả file .parquet trong thư mục thành 1 DataFrame."""
        parquet_files = list(directory.glob("*.parquet"))
        if not parquet_files:
            logger.warning(f"Không tìm thấy file .parquet trong: {directory}")
            return pd.DataFrame()

        dfs = [pd.read_parquet(f) for f in parquet_files]
        return pd.concat(dfs, ignore_index=True)

    def _apply_filters(
        self,
        df: pd.DataFrame,
        keyword: str = None,
        min_price: float = None,
        max_price: float = None,
    ) -> pd.DataFrame:
        """Áp dụng bộ lọc keyword và khoảng giá lên DataFrame."""
        if keyword and "keyword" in df.columns:
            df = df[df["keyword"].str.lower() == keyword.lower()]
        if min_price is not None and "price" in df.columns:
            df = df[df["price"] >= min_price]
        if max_price is not None and "price" in df.columns:
            df = df[df["price"] <= max_price]
        return df

    # === Product Queries ===

    def get_products(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        sort_by: str = "avg_rating",
        sort_order: str = "desc",
        keyword: str = None,
        min_price: float = None,
        max_price: float = None,
    ) -> tuple[list[dict], int]:
        """Lấy danh sách sản phẩm có pagination, search, sort, filter."""
        df = self.df_product_metrics.copy()

        # Apply keyword + price filters
        df = self._apply_filters(df, keyword=keyword, min_price=min_price, max_price=max_price)

        # Search theo tên sản phẩm
        if search:
            df = df[df["name"].str.contains(search, case=False, na=False)]

        total = len(df)

        # Sort
        ascending = sort_order.lower() == "asc"
        if sort_by in df.columns:
            df = df.sort_values(by=sort_by, ascending=ascending, na_position="last")

        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        df_page = df.iloc[start:end]

        # Convert to list of dicts, xử lý NaN
        records = df_page.where(df_page.notna(), None).to_dict(orient="records")
        return records, total

    def get_product_by_id(self, product_id: str) -> dict | None:
        """Lấy chi tiết 1 sản phẩm theo product_id."""
        df = self.df_product_metrics
        matches = df[df["product_id"].astype(str) == str(product_id)]
        if matches.empty:
            return None
        row = matches.iloc[0]
        return row.where(row.notna(), None).to_dict()

    # === Analytics Queries ===

    def get_overview(
        self,
        keyword: str = None,
        min_price: float = None,
        max_price: float = None,
    ) -> dict:
        """Tổng quan: tổng sản phẩm, giá trung bình, rating trung bình."""
        df = self._apply_filters(
            self.df_product_metrics.copy(),
            keyword=keyword, min_price=min_price, max_price=max_price,
        )
        avg_rating = (
            round(float(df["avg_rating"].mean()), 2)
            if "avg_rating" in df.columns and not df.empty
            else 0
        )
        return {
            "total_products": int(len(df)),
            "avg_price": (
                round(float(df["price"].mean()), 0)
                if "price" in df.columns and not df.empty
                else 0
            ),
            "avg_rating": avg_rating,
            "total_reviews": int(df["total_reviews"].sum()) if "total_reviews" in df.columns else 0,
            "total_keywords": int(df["keyword"].nunique()) if "keyword" in df.columns else 0,
        }

    def get_keyword_stats(self) -> list[dict]:
        """Thống kê chi tiết theo từng keyword đã cào."""
        df = self.df_product_metrics
        if "keyword" not in df.columns or df.empty:
            return []

        groups = df.groupby("keyword", dropna=True)
        results = []
        for kw, group in groups:
            if not kw or str(kw).strip() == "":
                continue

            # Rating distribution cho keyword này
            star_dist = {}
            for star in range(1, 6):
                col_name = f"star_{star}_count"
                star_dist[f"star_{star}"] = (
                    int(group[col_name].sum()) if col_name in group.columns else 0
                )
            star_dist["total"] = sum(star_dist.values())

            results.append({
                "keyword": str(kw),
                "total_products": int(len(group)),
                "avg_price": (
                    round(float(group["price"].mean()), 0) if "price" in group.columns else 0
                ),
                "avg_rating": (
                    round(float(group["avg_rating"].mean()), 2)
                    if "avg_rating" in group.columns else 0
                ),
                "total_reviews": (
                    int(group["total_reviews"].sum()) if "total_reviews" in group.columns else 0
                ),
                "rating_distribution": star_dist,
            })

        # Sắp xếp theo số lượng sản phẩm giảm dần
        results.sort(key=lambda x: x["total_products"], reverse=True)
        return results

    def get_top_products(
        self,
        metric: str = "avg_rating",
        limit: int = 10,
        keyword: str = None,
        min_price: float = None,
        max_price: float = None,
    ) -> list[dict]:
        """Top N sản phẩm theo metric (avg_rating, total_reviews, sold_count)."""
        df = self._apply_filters(
            self.df_product_metrics.copy(),
            keyword=keyword, min_price=min_price, max_price=max_price,
        )

        if metric not in df.columns:
            metric = "avg_rating"

        # Lọc sản phẩm có ít nhất 1 review để ranking có ý nghĩa
        if "total_reviews" in df.columns:
            df = df[df["total_reviews"] > 0]

        df = df.sort_values(by=metric, ascending=False).head(limit)
        return df.where(df.notna(), None).to_dict(orient="records")

    def get_reviews_by_product(self, product_id: str) -> list[dict]:
        """Lấy tất cả reviews của 1 sản phẩm (kèm sentiment nếu có)."""
        # Ưu tiên dùng sentiment data (đã có label), fallback về Silver reviews
        df = self.df_sentiment if not self.df_sentiment.empty else self.df_reviews
        if df.empty:
            return []

        # Tìm cột chứa product_id (có thể là product_id hoặc item_id)
        id_col = None
        for col_name in ["product_id", "item_id", "itemid"]:
            if col_name in df.columns:
                id_col = col_name
                break

        if id_col is None:
            return []

        matches = df[df[id_col].astype(str) == str(product_id)]
        if matches.empty:
            return []

        return matches.where(matches.notna(), None).to_dict(orient="records")

    # === Sentiment Queries ===

    def get_sentiment_overview(self) -> dict:
        """Tổng quan cảm xúc: tỷ lệ positive/negative/neutral."""
        df = self.df_sentiment
        if df.empty or "sentiment_label" not in df.columns:
            return {"positive": 0, "negative": 0, "neutral": 0, "total": 0}

        counts = df["sentiment_label"].value_counts().to_dict()
        total = len(df)

        return {
            "positive": int(counts.get("positive", 0)),
            "negative": int(counts.get("negative", 0)),
            "neutral": int(counts.get("neutral", 0)),
            "total": total,
            "positive_pct": round(counts.get("positive", 0) / total * 100, 1) if total > 0 else 0,
            "negative_pct": round(counts.get("negative", 0) / total * 100, 1) if total > 0 else 0,
            "neutral_pct": round(counts.get("neutral", 0) / total * 100, 1) if total > 0 else 0,
        }

    def get_rating_distribution(self) -> dict:
        """Phân bố đánh giá (1-5 sao) trên toàn bộ sản phẩm."""
        df = self.df_product_metrics

        distribution = {}
        for star in range(1, 6):
            col_name = f"star_{star}_count"
            if col_name in df.columns:
                distribution[f"star_{star}"] = int(df[col_name].sum())
            else:
                distribution[f"star_{star}"] = 0

        total = sum(distribution.values())
        distribution["total"] = total

        return distribution

    def get_negative_topics(self) -> list[dict]:
        """Lấy danh sách các chủ đề phàn nàn từ file negative_topics."""
        df = self.df_negative_topics
        if df.empty or "topic" not in df.columns or "count" not in df.columns:
            return []

        # Sắp xếp theo count giảm dần và trả về list dict
        df_sorted = df.sort_values(by="count", ascending=False).head(20)
        return df_sorted.to_dict(orient="records")

    # === Price History Queries ===

    def get_price_history_by_product(self, product_id: str) -> list[dict]:
        """Lấy lịch sử giá của 1 sản phẩm từ Gold price_history."""
        df = self.df_price_history
        if df.empty or "product_id" not in df.columns:
            return []

        matches = df[df["product_id"].astype(str) == str(product_id)].copy()
        if matches.empty:
            return []

        if "scraped_at" in matches.columns:
            matches = matches.sort_values(by="scraped_at")
        return matches.where(matches.notna(), None).to_dict(orient="records")

    def get_price_volatility(self, limit: int = 20, suspicious_only: bool = False) -> list[dict]:
        """Top sản phẩm có biến động giá mạnh nhất."""
        df = self.df_price_history
        if df.empty or "price_change_pct" not in df.columns:
            return []

        result = df.copy()
        result = result[result["price_change_pct"].notna()]
        if suspicious_only and "is_discount_suspicious" in result.columns:
            result = result[result["is_discount_suspicious"]]

        result = result.assign(_abs_change=result["price_change_pct"].abs())
        result = result.sort_values(by="_abs_change", ascending=False).head(limit)
        result = result.drop(columns=["_abs_change"], errors="ignore")
        return result.where(result.notna(), None).to_dict(orient="records")

# Singleton instance
data_service = DataService()
