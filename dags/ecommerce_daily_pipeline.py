"""
Airflow DAG: Daily Shopee e-commerce data pipeline.

Schedule:
    02:00 every day

Flow:
    Scrape -> Bronze -> Silver + DQ -> Gold Metrics -> Gold Price History
    -> ML Sentiment -> Topic Modeling -> Backend cache reload

Set ENABLE_SCRAPE=true in Airflow environment when Chrome CDP is available.
"""

from __future__ import annotations

import os
import urllib.request
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.operators.python import PythonOperator, ShortCircuitOperator


PROJECT_ROOT = os.getenv("PROJECT_ROOT", "/opt/airflow/project")
PYTHON_BIN = os.getenv("PIPELINE_PYTHON", "python")
PIPELINE_KEYWORD = os.getenv("PIPELINE_KEYWORD", "bàn phím cơ")
BACKEND_RELOAD_URL = os.getenv("BACKEND_RELOAD_URL", "http://backend:8000/api/reload")


default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


def _is_scrape_enabled() -> bool:
    return os.getenv("ENABLE_SCRAPE", "false").lower() == "true"


def _reload_backend_cache() -> None:
    req = urllib.request.Request(BACKEND_RELOAD_URL, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.status >= 400:
            raise RuntimeError(f"Backend reload failed with status {response.status}")


def _cmd(module: str) -> str:
    return f'cd "{PROJECT_ROOT}" && {PYTHON_BIN} -m {module}'


with DAG(
    dag_id="daily_ecommerce_data_pipeline",
    description="Shopee Medallion ETL with DQ, price history, ML, and backend reload",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="0 2 * * *",
    catchup=False,
    max_active_runs=1,
    tags=["ecommerce", "shopee", "medallion", "data-quality"],
) as dag:
    start = EmptyOperator(task_id="start")

    should_scrape = ShortCircuitOperator(
        task_id="should_scrape",
        python_callable=_is_scrape_enabled,
        ignore_downstream_trigger_rules=False,
    )

    scrape_shopee = BashOperator(
        task_id="scrape_shopee_products",
        bash_command=(
            f'cd "{PROJECT_ROOT}" && {PYTHON_BIN} -m ingestion scrape '
            f'--keyword "{PIPELINE_KEYWORD}" --pages 1 --with-reviews --max-reviews 50'
        ),
    )

    bronze_ingestion = BashOperator(
        task_id="bronze_jsonl_to_delta",
        bash_command=_cmd("processing.bronze.json_to_bronze"),
        trigger_rule="none_failed",
    )

    silver_products = BashOperator(
        task_id="silver_products_cleansing_with_dq",
        bash_command=_cmd("processing.silver.products_cleansing"),
    )

    silver_reviews = BashOperator(
        task_id="silver_reviews_cleansing_with_dq",
        bash_command=_cmd("processing.silver.reviews_cleansing"),
    )

    gold_product_metrics = BashOperator(
        task_id="gold_product_metrics",
        bash_command=_cmd("processing.gold.product_metrics"),
    )

    gold_price_history = BashOperator(
        task_id="gold_price_history",
        bash_command=_cmd("processing.gold.price_history"),
    )

    ml_sentiment = BashOperator(
        task_id="ml_sentiment_analysis",
        bash_command=_cmd("ml.sentiment_analysis"),
    )

    ml_negative_topics = BashOperator(
        task_id="ml_negative_topic_modeling",
        bash_command=_cmd("ml.topic_modeling"),
    )

    reload_backend_cache = PythonOperator(
        task_id="reload_backend_cache",
        python_callable=_reload_backend_cache,
    )

    end = EmptyOperator(task_id="end")

    start >> should_scrape >> scrape_shopee >> bronze_ingestion
    start >> bronze_ingestion
    bronze_ingestion >> [silver_products, silver_reviews]
    [silver_products, silver_reviews] >> gold_product_metrics
    silver_products >> gold_price_history
    silver_reviews >> ml_sentiment >> ml_negative_topics
    [gold_product_metrics, gold_price_history, ml_negative_topics] >> reload_backend_cache >> end
