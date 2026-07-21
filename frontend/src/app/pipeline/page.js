"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle, AlertCircle, Clock, Database, Cpu, Globe,
  ArrowRight, RefreshCw, Layers, GitBranch, FlaskConical,
  Server, BarChart3, ChevronRight, Table2, Zap,
} from "lucide-react";
import { getHealth, getDataStatus } from "@/lib/api";

// ============================================================
// STATIC PIPELINE ARCHITECTURE DEFINITION
// Reflects the actual Medallion Architecture in AGENTS.md
// ============================================================
const PIPELINE_STAGES = [
  {
    id: "ingestion",
    layer: "INGESTION",
    icon: Globe,
    title: "Data Ingestion",
    subtitle: "Playwright CDP",
    color: "sky",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    iconColor: "text-sky-600",
    badgeColor: "bg-sky-100 text-sky-700",
    steps: [
      { name: "Playwright CDP", detail: "Chrome DevTools Protocol", tech: "Playwright" },
      { name: "Anti-Bot Bypass", detail: "CAPTCHA detection + exponential backoff", tech: "Python" },
      { name: "Checkpoint Save", detail: "Resume on crash, per-keyword progress", tech: "JSON" },
      { name: "Raw JSONL Output", detail: "Products + Reviews to ./data/raw/", tech: "JSONL" },
    ],
    output: "Raw JSONL",
    outputDesc: "Products & Reviews",
  },
  {
    id: "bronze",
    layer: "BRONZE",
    icon: Layers,
    title: "Bronze Layer",
    subtitle: "Raw Delta Lake",
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-600",
    badgeColor: "bg-amber-100 text-amber-700",
    steps: [
      { name: "JSONL → Parquet", detail: "Schema inference + type coercion", tech: "PySpark" },
      { name: "Delta Lake Write", detail: "ACID transactions, time travel", tech: "Delta Lake" },
      { name: "Raw Preservation", detail: "No transformations — immutable", tech: "Delta" },
      { name: "scraped_at timestamp", detail: "Data lineage tracking", tech: "PySpark" },
    ],
    output: "Delta Tables",
    outputDesc: "Immutable raw store",
  },
  {
    id: "silver",
    layer: "SILVER",
    icon: GitBranch,
    title: "Silver Layer",
    subtitle: "Cleaned & Deduplicated",
    color: "violet",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    iconColor: "text-violet-600",
    badgeColor: "bg-violet-100 text-violet-700",
    steps: [
      { name: "Null Filtering", detail: "Remove incomplete records", tech: "PySpark" },
      { name: "Deduplication", detail: "product_id + keyword composite key", tech: "PySpark" },
      { name: "Price Normalization", detail: "VNĐ string → Float64", tech: "PySpark" },
      { name: "Data Validation", detail: "Great Expectations quality gates", tech: "GE" },
    ],
    output: "Clean Delta",
    outputDesc: "Validated & typed",
  },
  {
    id: "gold",
    layer: "GOLD",
    icon: Database,
    title: "Gold Layer",
    subtitle: "Aggregated Parquet",
    color: "emerald",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-600",
    badgeColor: "bg-emerald-100 text-emerald-700",
    steps: [
      { name: "Product Metrics", detail: "avg_rating, total_reviews, sold_count", tech: "PySpark" },
      { name: "Keyword Stats", detail: "Per-keyword aggregation", tech: "PySpark" },
      { name: "Price History", detail: "Time-series snapshot per product", tech: "PySpark" },
      { name: "Gold Parquet Write", detail: "Columnar, query-optimized", tech: "Parquet" },
    ],
    output: "Parquet Files",
    outputDesc: "API-ready aggregates",
  },
];

const ML_PIPELINE = [
  { step: 1, name: "Load Silver Reviews", detail: "pd.read_parquet(SILVER_REVIEWS_PATH)", icon: Table2 },
  { step: 2, name: "Vietnamese Tokenization", detail: "underthesea.word_tokenize()", icon: Cpu },
  { step: 3, name: "Sentiment Classification", detail: "Positive / Negative / Neutral", icon: FlaskConical },
  { step: 4, name: "Topic Modeling", detail: "LDA — Negative topic extraction", icon: GitBranch },
  { step: 5, name: "Gold Sentiment Write", detail: "./data/gold/reviews_sentiment/", icon: Database },
];

const SERVING_STACK = [
  { name: "FastAPI", detail: "REST endpoints + Pydantic schemas", icon: Server, color: "text-emerald-600", bg: "bg-emerald-50" },
  { name: "In-Memory Pandas", detail: "Gold Parquet → RAM on startup, <50ms p95", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
  { name: "Prometheus Metrics", detail: "/metrics → Grafana dashboard", icon: BarChart3, color: "text-sky-600", bg: "bg-sky-50" },
  { name: "Next.js Frontend", detail: "Recharts + TailwindCSS v4", icon: Globe, color: "text-violet-600", bg: "bg-violet-50" },
];

// ============================================================
// HELPER COMPONENTS
// ============================================================
function StatusDot({ status }) {
  const map = {
    ok: "bg-emerald-500",
    warn: "bg-amber-400",
    error: "bg-red-500",
    unknown: "bg-slate-300",
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${map[status] || map.unknown} ${status === "ok" ? "animate-pulse" : ""}`} />
  );
}

function MetricPill({ label, value, status = "ok" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 flex items-center gap-2">
        <StatusDot status={status} />
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-900 font-mono">{value}</span>
    </div>
  );
}

function StageBadge({ label, color }) {
  return (
    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${color}`}>
      {label}
    </span>
  );
}

function Arrow() {
  return (
    <div className="hidden lg:flex items-center justify-center w-8 flex-shrink-0">
      <ArrowRight className="w-5 h-5 text-slate-300" />
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function PipelinePage() {
  const [health, setHealth] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStatus(isManual = false) {
    if (isManual) setRefreshing(true);
    try {
      const [h, ds] = await Promise.all([
        getHealth().catch(() => null),
        getDataStatus().catch(() => null),
      ]);
      setHealth(h);
      setDataStatus(ds);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchStatus();
    const interval = setInterval(() => { if (!cancelled) fetchStatus(); }, 30000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive real stats from API
  const totalProducts = health?.total_products ?? null;
  const totalReviews = health?.total_reviews ?? null;
  const datasets = dataStatus?.datasets ?? {};

  const goldStatus = totalProducts !== null ? "ok" : "warn";

  const summaryCards = [
    {
      label: "Total Products",
      value: totalProducts !== null ? totalProducts.toLocaleString("vi-VN") : "—",
      sub: "Gold · product_metrics",
      icon: Database,
      status: goldStatus,
      color: "emerald",
    },
    {
      label: "Total Reviews",
      value: totalReviews !== null ? totalReviews.toLocaleString("vi-VN") : "—",
      sub: "Gold · reviews_sentiment",
      icon: Table2,
      status: goldStatus,
      color: "violet",
    },
    {
      label: "API Status",
      value: health ? "Healthy" : "Offline",
      sub: "FastAPI Backend",
      icon: Server,
      status: health ? "ok" : "error",
      color: health ? "emerald" : "rose",
    },
    {
      label: "Gold Freshness",
      value: datasets.product_metrics?.loaded_at
        ? new Date(datasets.product_metrics.loaded_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : "—",
      sub: "Last reload into memory",
      icon: Clock,
      status: datasets.product_metrics?.loaded_at ? "ok" : "warn",
      color: "sky",
    },
  ];

  const colorMap = {
    emerald: { icon: "text-emerald-600", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
    violet:  { icon: "text-violet-600",  bg: "bg-violet-50",  badge: "bg-violet-100 text-violet-700" },
    sky:     { icon: "text-sky-600",     bg: "bg-sky-50",     badge: "bg-sky-100 text-sky-700" },
    amber:   { icon: "text-amber-600",   bg: "bg-amber-50",   badge: "bg-amber-100 text-amber-700" },
    rose:    { icon: "text-rose-600",    bg: "bg-rose-50",    badge: "bg-rose-100 text-rose-700" },
  };

  return (
    <div className="space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Data Engineering</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pipeline Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end data flow · Medallion Architecture (Bronze → Silver → Gold) · NLP ML Pipeline
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {lastRefresh && (
            <span className="text-xs text-slate-400">
              Cập nhật: {lastRefresh.toLocaleTimeString("vi-VN")}
            </span>
          )}
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const c = colorMap[card.color] || colorMap.emerald;
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <div className={`rounded-xl p-2.5 flex-shrink-0 ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 leading-none">
                  {loading ? <span className="inline-block w-16 h-6 bg-slate-100 rounded animate-pulse" /> : card.value}
                </p>
                <p className="text-xs font-medium text-slate-600 mt-1">{card.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.sub}</p>
              </div>
              <div className="ml-auto flex-shrink-0 mt-0.5">
                {card.status === "ok" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                {card.status === "warn" && <Clock className="w-4 h-4 text-amber-400" />}
                {card.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Medallion Architecture Flow ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">Medallion Architecture</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-medium">4 Layers</span>
        </div>

        {/* Flow diagram — horizontal on large, vertical on mobile */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="flex flex-col lg:flex-row items-stretch gap-3 flex-1">
                {/* Stage Card */}
                <div className={`flex-1 bg-white rounded-2xl border ${stage.borderColor} shadow-sm overflow-hidden`}>
                  {/* Header */}
                  <div className={`${stage.bgColor} px-4 py-3 flex items-center justify-between border-b ${stage.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${stage.iconColor}`} />
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${stage.iconColor}`}>
                        {stage.layer}
                      </span>
                    </div>
                    <StageBadge label={stage.layer} color={stage.badgeColor} />
                  </div>
                  {/* Body */}
                  <div className="px-4 py-3 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{stage.title}</p>
                    <p className="text-xs text-slate-500 mb-3">{stage.subtitle}</p>
                    {stage.steps.map((step) => (
                      <div key={step.name} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 leading-tight">{step.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{step.detail}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-auto ${stage.badgeColor}`}>
                          {step.tech}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Footer output */}
                  <div className={`px-4 py-2.5 ${stage.bgColor} border-t ${stage.borderColor} flex items-center justify-between`}>
                    <span className="text-[10px] text-slate-500">Output</span>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${stage.iconColor}`}>{stage.output}</p>
                      <p className="text-[10px] text-slate-400">{stage.outputDesc}</p>
                    </div>
                  </div>
                </div>
                {/* Arrow between stages */}
                {idx < PIPELINE_STAGES.length - 1 && <Arrow />}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ML Pipeline + Serving Layer ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ML Pipeline */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">ML / NLP Pipeline</h2>
            </div>
            <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-200 px-2 py-0.5 rounded font-medium">underthesea · scikit-learn</span>
          </div>
          <div className="px-5 py-4 space-y-1">
            {ML_PIPELINE.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center text-[10px] font-bold text-violet-600">
                    {item.step}
                  </div>
                  <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{item.detail}</p>
                  </div>
                  {idx < ML_PIPELINE.length - 1 && (
                    <div className="ml-auto">
                      <ArrowRight className="w-3 h-3 text-slate-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Serving Layer + Live Data Status */}
        <section className="space-y-5">
          {/* Serving Stack */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Serving Layer</h2>
            </div>
            <div className="px-5 py-3 grid grid-cols-2 gap-3">
              {SERVING_STACK.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className={`rounded-xl ${item.bg} p-3 flex items-start gap-2`}>
                    <Icon className={`w-4 h-4 ${item.color} mt-0.5 flex-shrink-0`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${item.color}`}>{item.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Dataset Status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Live Dataset Status</h2>
              <span className="ml-auto">
                {loading
                  ? <span className="text-[10px] text-slate-400">Loading...</span>
                  : <StatusDot status={health ? "ok" : "error"} />
                }
              </span>
            </div>
            <div className="px-5 py-3">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div>
                  <MetricPill
                    label="product_metrics"
                    value={datasets.product_metrics?.row_count != null ? `${datasets.product_metrics.row_count.toLocaleString("vi-VN")} rows` : "Not loaded"}
                    status={datasets.product_metrics?.row_count ? "ok" : "warn"}
                  />
                  <MetricPill
                    label="reviews_sentiment"
                    value={datasets.reviews_sentiment?.row_count != null ? `${datasets.reviews_sentiment.row_count.toLocaleString("vi-VN")} rows` : "Not loaded"}
                    status={datasets.reviews_sentiment?.row_count ? "ok" : "warn"}
                  />
                  <MetricPill
                    label="negative_topics"
                    value={datasets.negative_topics?.row_count != null ? `${datasets.negative_topics.row_count.toLocaleString("vi-VN")} rows` : "Not loaded"}
                    status={datasets.negative_topics?.row_count ? "ok" : "warn"}
                  />
                  <MetricPill
                    label="price_history"
                    value={datasets.price_history?.row_count != null ? `${datasets.price_history.row_count.toLocaleString("vi-VN")} rows` : "Not loaded"}
                    status={datasets.price_history?.row_count ? "ok" : "warn"}
                  />
                  <MetricPill
                    label="FastAPI uptime"
                    value={health ? "Online" : "Offline"}
                    status={health ? "ok" : "error"}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Tech Stack Reference ── */}
      <section className="bg-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Technology Stack</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { layer: "Ingestion", tech: "Playwright", sub: "CDP" },
            { layer: "Storage", tech: "Delta Lake", sub: "Parquet / ACID" },
            { layer: "Processing", tech: "Apache Spark", sub: "PySpark 3.x" },
            { layer: "ML / NLP", tech: "underthesea", sub: "scikit-learn" },
            { layer: "Backend", tech: "FastAPI", sub: "Pydantic v2" },
            { layer: "Frontend", tech: "Next.js 16", sub: "Recharts · TW v4" },
          ].map((item) => (
            <div key={item.layer} className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.layer}</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">{item.tech}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
