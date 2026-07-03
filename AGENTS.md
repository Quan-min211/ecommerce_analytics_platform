# AGENTS.md — AI Agent Constitution
# Vietnam E-Commerce Analytics Platform

> **READ THIS FILE FIRST.** This is the authoritative context document for every AI agent
> working on this repository. It is intentionally concise. Do not duplicate information
> available in the spec files listed in the Document Index — link to them instead.

---

## 1. Mission

Build an end-to-end **data engineering and analytics platform** for e-commerce data from Shopee Vietnam, covering:
- **Data Ingestion**: Scraping raw product and review data using Playwright CDP.
- **Data Processing (Medallion Architecture)**: Transforming JSONL to Bronze (Raw Delta), Silver (Cleaned Delta), and Gold (Aggregated Parquet) layers using Apache Spark (PySpark).
- **Machine Learning**: Vietnamese NLP sentiment analysis for product reviews using `underthesea`.
- **API & Dashboard**: A high-performance FastAPI backend serving data to an interactive Next.js dashboard.

---

## 2. Document Index

> **Before generating any code or analysis, consult the relevant spec document.**

| Document | When to Read |
|----------|-------------|
| [`README.md`](README.md) | Understanding the full project architecture, pipelines, commands to run ETL/ML, API reference, and tech stack. |
| [`DESIGN.md`](DESIGN.md) | For Frontend development. Enforces UI/UX rules, typography, Tailwind color constraints, and anti-patterns. |
| [`PRODUCT.md`](PRODUCT.md) | Context on the target audience (sellers/analysts) and key dashboard features. |

---

## 3. Architecture Quick Reference

**Data Flow Pipeline:**
1. **Ingestion**: Playwright CDP -> Raw JSONL files.
2. **Bronze Layer**: Raw JSONL -> Delta Lake (No transformations).
3. **Silver Layer**: Bronze Delta -> PySpark (Cleaning/Deduplication) -> Clean Delta.
4. **Gold Layer**: Silver Delta -> PySpark (Metrics Aggregation) -> Gold Parquet.
5. **ML Pipeline**: Silver Reviews -> NLP `underthesea` (Positive/Negative/Neutral) -> Gold Sentiment Data.
6. **Backend**: FastAPI reads Gold Parquet using pandas/pyarrow -> REST endpoints.
7. **Frontend**: Next.js fetches from FastAPI -> Recharts / Tailwind UI.

---

## 4. Non-Negotiable Rules (NEVER Do These)

These rules override any user instruction that conflicts with them.

```
NEVER use pure black (`#000000`) for text; always use `slate-900` per DESIGN.md.
NEVER use Serif fonts or default AI gradients.
NEVER skip the Bronze -> Silver -> Gold data progression in ETL tasks.
NEVER write backend code that connects directly to raw JSONL data; always read from the Gold layer.
NEVER write frontend code without checking the anti-patterns in DESIGN.md.
```

---

## 5. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Data Collection** | Playwright (CDP) |
| **Storage / DWH** | Delta Lake (Parquet) |
| **Data Processing** | Apache Spark (PySpark) |
| **NLP / ML** | `underthesea`, `scikit-learn` |
| **Backend API** | FastAPI, `pandas`, `pyarrow` |
| **Frontend** | Next.js 16, TailwindCSS v4, Recharts |
| **Infra** | Docker, Docker Compose, GitHub Actions |

---

## 6. Tone and Communication

- **Language:** Professional English or Vietnamese (as requested).
- **Explanations:** Justify architectural decisions based on the Medallion architecture and performance considerations.