# Data Pipeline Architecture

## Tổng quan kiến trúc Bronze → Silver → Gold

```
Raw JSONL  →  Bronze (Delta Lake)  →  Silver (Delta Lake)  →  Gold (Parquet)  →  Backend (Pandas)  →  API
```

---

## Tại sao dùng Spark ở Bronze & Silver nhưng Pandas ở Gold Serving?

Đây là **thiết kế có chủ đích** — phân tách rõ ràng giữa **ETL processing** và **Serving layer**:

| Layer | Engine | Lý do |
|---|---|---|
| Bronze | **PySpark + Delta Lake** | Schema evolution, ACID transactions, audit log (time travel) |
| Silver | **PySpark + Delta Lake** | Distributed data cleansing, dedup, joins có thể scale |
| Gold | **PySpark ghi Parquet**, **Pandas đọc** | Parquet là format chuẩn công nghiệp; Pandas serve nhanh hơn Spark cho dataset nhỏ |
| Serving | **Pandas in-memory** | Dataset Gold < 100K rows → load 1 lần vào RAM, sub-millisecond query |

### Nguyên tắc: Right Tool for Right Job

- **Spark** phù hợp cho ETL: parallel processing, fault tolerance, schema inference trên dữ liệu raw không đồng nhất.
- **Pandas** phù hợp cho serving: zero JVM startup cost, tích hợp trực tiếp với FastAPI, filter/sort trên in-memory DataFrame nhanh hơn Spark với dataset < 1M rows.
- Nếu dataset tăng lên hàng triệu rows, chỉ cần thay backend sang **Polars** hoặc **DuckDB** mà không cần sửa ETL pipeline.

---

## Layer-by-layer Detail

### Bronze Layer (`data/bronze/`)
- **Format**: Delta Lake (Parquet + transaction log)
- **Mode**: `overwrite` — mỗi batch crawl ghi đè toàn bộ
- **Script**: `processing/bronze/json_to_bronze.py`
- **Input**: Raw JSONL từ `data/raw/`
- **Output**: Delta table với schema tự động inference

### Silver Layer (`data/silver/`)
- **Format**: Delta Lake
- **Mode**: `overwrite` (có thể chuyển sang `merge` cho incremental)
- **Script**: `processing/silver/products_cleansing.py`, `reviews_cleansing.py`
- **Transformations**:
  - `dropDuplicates(["product_id", "scraped_at"])` — giữ lại data crawl nhiều lần
  - Cast price sang IntegerType
  - Thêm `processed_at` timestamp
  - Data Quality checks (null rate, price validation)

### Gold Layer (`data/gold/`)
- **Format**: Parquet (not Delta — không cần ACID ở tầng serving)
- **Mode**: `overwrite`
- **Scripts**: `processing/gold/product_metrics.py`, `price_history.py`
- **Transformations**:
  - Join Products ⨝ Reviews → `product_metrics`
  - Window function `ROW_NUMBER()` để lấy snapshot giá mới nhất
  - Tính `avg_rating`, `total_reviews`, `star_N_count`

### Data Quality (`processing/quality_check.py`)
- Chạy sau mỗi ETL để report: null rate, duplicate rate, row count per layer
- Output: `data/reports/quality_report_YYYYMMDD.json`

---

## Giải thích cho hội đồng

> **"Tại sao không dùng Spark từ đầu đến cuối?"**
>
> Dùng Spark để serve API sẽ phải khởi động JVM (~15-30 giây), tốn RAM cho executor,
> và latency mỗi query sẽ cao hơn đáng kể. Trong khi đó Gold layer chỉ có vài chục
> nghìn rows — pandas load 1 lần vào memory, mỗi API call chỉ mất <5ms.

> **"Tại sao không dùng Pandas từ đầu đến cuối?"**
>
> Bronze/Silver cần xử lý raw JSONL từ nhiều nguồn có schema không đồng nhất, cần schema
> inference, type coercion. Spark + Delta Lake cung cấp ACID transactions và time travel
> — audit lại data tại bất kỳ thời điểm nào.
