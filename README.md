# Vietnam E-Commerce Analytics Platform

An end-to-end data engineering and analytics project that collects, processes, and visualizes e-commerce data from Shopee Vietnam. Built with a Medallion Architecture (Bronze-Silver-Gold) Data Lakehouse, a FastAPI REST backend, a Next.js interactive dashboard, and NLP-powered sentiment analysis.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the ETL Pipeline](#running-the-etl-pipeline)
  - [Running the ML Pipeline](#running-the-ml-pipeline)
  - [Starting the Application](#starting-the-application)
  - [Docker Deployment](#docker-deployment)
- [API Reference](#api-reference)
- [CI/CD](#cicd)
- [Roadmap](#roadmap)
- [License](#license)

---

## Architecture

```
                    Shopee Vietnam
                         |
                   Playwright CDP
                         |
                    Raw JSONL Files
                         |
          +--------------+--------------+
          |              |              |
     Bronze Layer   Silver Layer   Gold Layer
     (Raw Delta)   (Clean Delta)  (Aggregated)
                                       |
                        +--------------+--------------+
                        |                             |
                   FastAPI Backend             ML / NLP Pipeline
                   (pandas + pyarrow)         (underthesea)
                        |                             |
                   REST API (/api)            Sentiment Labels
                        |                             |
                        +-----------------------------+
                                       |
                              Next.js Dashboard
                         (TailwindCSS + Recharts)
```

**Data Flow:**

1. **Ingestion** — Playwright CDP connects to a live Chrome session, intercepts Shopee API responses, and saves raw product/review data as JSONL files.
2. **Bronze Layer** — Raw JSONL is loaded into Delta Lake format without transformation.
3. **Silver Layer** — PySpark cleans, deduplicates, and normalizes the data.
4. **Gold Layer** — PySpark aggregates product metrics (ratings, review counts, star distributions).
5. **ML Pipeline** — `underthesea` NLP library analyzes Vietnamese review sentiment (positive/negative/neutral).
6. **Backend API** — FastAPI reads Gold Layer Parquet files via pandas into memory, serving data through REST endpoints.
7. **Frontend** — Next.js dashboard fetches from the API and renders interactive charts, tables, and modals.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Data Collection | Playwright (CDP) | Browser automation, API interception |
| Data Storage | Delta Lake (Parquet) | ACID transactions, versioned data lake |
| Data Processing | Apache Spark (PySpark) | Distributed ETL pipeline |
| NLP / ML | underthesea, scikit-learn | Vietnamese sentiment analysis |
| Backend API | FastAPI, pandas, pyarrow | High-performance REST API |
| Frontend | Next.js 16, TailwindCSS v4, Recharts | Interactive analytics dashboard |
| Containerization | Docker, Docker Compose | Reproducible deployments |
| CI/CD | GitHub Actions | Automated lint, test, and build |

---

## Project Structure

```
.
├── ingestion/               # Data collection module
│   ├── scrapers/            #   Shopee Playwright scraper
│   ├── writers/             #   JSONL file writer
│   ├── cli.py               #   CLI entry point
│   └── config.py            #   Scraper configuration
│
├── processing/              # Spark ETL pipeline
│   ├── bronze/              #   Raw data ingestion (JSONL -> Delta)
│   ├── silver/              #   Data cleansing & normalization
│   ├── gold/                #   Metric aggregation & analytics
│   └── utils/               #   Spark session helpers
│
├── ml/                      # Machine learning & NLP
│   └── sentiment_analysis.py#   Vietnamese review sentiment (underthesea)
│
├── backend/                 # FastAPI REST API
│   └── app/
│       ├── main.py          #   Application entry point
│       ├── config.py        #   Path & server configuration
│       ├── routers/         #   API route handlers
│       │   ├── products.py  #     Product CRUD + reviews
│       │   └── analytics.py #     Overview, top products, sentiment
│       ├── models/          #   Pydantic schemas
│       └── services/        #   Data access layer (pandas)
│
├── frontend/                # Next.js dashboard
│   └── src/
│       ├── app/             #   App Router pages
│       │   ├── page.js      #     Dashboard overview
│       │   ├── products/    #     Product listing & search
│       │   └── analytics/   #     Advanced charts & analysis
│       ├── components/      #   Reusable UI components
│       │   ├── Sidebar.js
│       │   ├── KpiCard.js
│       │   ├── RatingChart.js
│       │   ├── SentimentChart.js
│       │   ├── TopProductsTable.js
│       │   ├── ProductModal.js
│       │   └── ReviewsModal.js
│       └── lib/
│           └── api.js       #   API client
│
├── data/                    # Data lake (gitignored)
│   ├── raw/                 #   Original JSONL files
│   ├── bronze/              #   Raw Delta tables
│   ├── silver/              #   Cleaned Delta tables
│   └── gold/                #   Aggregated Parquet files
│
├── test/                    # Unit & integration tests
├── scripts/                 # Utility scripts
├── .github/workflows/       # CI/CD pipeline
├── docker-compose.yml       # Container orchestration
├── pyproject.toml           # Python project configuration
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 20 or higher
- Java 11 or 17 (required for PySpark)
- Google Chrome (required for Playwright CDP scraping)
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/Quan-min211/da_shoppe.git
cd da_shoppe

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

# Install core + backend + ML dependencies
pip install -e ".[backend,ml]"

# Install processing dependencies (for Spark ETL)
pip install -e ".[processing]"

# Install dev dependencies (for linting and testing)
pip install -e ".[dev]"

# Copy environment configuration
cp .env.example .env

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running the ETL Pipeline

Before starting, open Chrome with remote debugging enabled and log in to Shopee:

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

Then run the pipeline in order:

```bash
# Step 1: Scrape products and reviews from Shopee
python -m ingestion scrape --pages 1 --with-reviews --max-reviews 50

# Step 2: Ingest raw data into Bronze Layer (Delta Lake)
python -m processing.bronze.json_to_bronze

# Step 3: Clean and normalize into Silver Layer
python -m processing.silver.products_cleansing
python -m processing.silver.reviews_cleansing

# Step 4: Aggregate metrics into Gold Layer
python -m processing.gold.product_metrics

# Step 5: Build Gold price history for time-series tracking
python -m processing.gold.price_history
```

### Data Quality & Governance

Silver jobs now apply data quality gates before writing trusted data:

- Products with invalid identifiers, missing names, invalid ratings, or `price <= 0` are rejected.
- Reviews with invalid identifiers or ratings are rejected.
- Reviews with missing text are logged for ML governance.

Rejected records are written to `data/quality/rejected/`, and JSON audit reports are written to `data/quality/reports/`.

### Airflow Orchestration

The Airflow DAG in `dags/ecommerce_daily_pipeline.py` schedules the production-style pipeline at `02:00` daily:

```text
scrape -> bronze -> silver products/reviews + DQ -> gold metrics
       -> gold price history -> sentiment -> negative topics -> backend reload
```

Useful environment variables:

| Variable | Purpose |
|----------|---------|
| `PROJECT_ROOT` | Path to the repository inside the Airflow worker. |
| `PIPELINE_PYTHON` | Python executable used by the DAG. |
| `PIPELINE_KEYWORD` | Shopee keyword for scheduled scraping. |
| `ENABLE_SCRAPE` | Set to `true` only when Chrome CDP is available to Airflow. |
| `BACKEND_RELOAD_URL` | Backend cache reload endpoint. |

### Running the ML Pipeline

```bash
# Analyze sentiment of all Vietnamese reviews using underthesea
python -m ml.sentiment_analysis
```

This reads Silver Layer reviews, classifies each as positive, negative, or neutral, and saves the results to `data/gold/reviews_sentiment/`.

### Starting the Application

Start the backend and frontend in two separate terminals:

```bash
# Terminal 1: Backend API (port 8000)
python -m uvicorn backend.app.main:app --reload

# Terminal 2: Frontend Dashboard (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Docker Deployment

```bash
# Build and start both services
docker compose up --build

# Run in detached mode
docker compose up --build -d

# Stop all services
docker compose down
```

The backend runs on port `8000` and the frontend on port `3000`.

---

## API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/products` | List products (pagination, search, sort) |
| GET | `/api/products/{id}` | Product detail |
| GET | `/api/products/{id}/reviews` | Product reviews with sentiment labels |
| GET | `/api/analytics/overview` | KPI summary (total products, avg price, avg rating) |
| GET | `/api/analytics/top-products` | Top N products by metric |
| GET | `/api/analytics/rating-distribution` | Star rating distribution (1-5) |
| GET | `/api/analytics/sentiment-overview` | Sentiment analysis summary |
| GET | `/api/analytics/price-history/{product_id}` | Product price history over time |
| GET | `/api/analytics/price-volatility` | Products with strongest price changes |
| POST | `/api/reload` | Reload data from Gold Layer |

Interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

---

## CI/CD

The project uses GitHub Actions with three jobs that run on every push and pull request to `main` and `develop`:

| Job | Description |
|-----|-------------|
| Backend | Python lint (Ruff) and unit tests (pytest) on Python 3.10 and 3.11 |
| Frontend | ESLint and production build verification |
| Docker | Build check for both backend and frontend Docker images |

---

## Roadmap

- [x] Phase 0 — Shopee scraping proof of concept (Playwright CDP)
- [x] Phase 1 — Project structure, ingestion module (products and reviews)
- [x] Phase 2 — Spark ETL pipeline with Delta Lake (Bronze, Silver, Gold)
- [x] Phase 3 — FastAPI backend and Next.js dashboard
- [x] Phase 4 — NLP sentiment analysis, Docker Compose, CI/CD, polish

---

## License

MIT
