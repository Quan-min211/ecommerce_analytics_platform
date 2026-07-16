/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import {
  Activity, RefreshCw, Server, Database, ExternalLink,
  CheckCircle, AlertCircle, Clock, BarChart2, FileText,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MonitoringPage() {
  const [health, setHealth] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState(null);
  const [host, setHost] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [healthRes, statusRes] = await Promise.all([
          fetch(`${API_BASE}/api/health`),
          fetch(`${API_BASE}/api/analytics/data-status`),
        ]);
        const healthData = healthRes.ok ? await healthRes.json() : null;
        const statusData = statusRes.ok ? await statusRes.json() : null;
        if (!cancelled) {
          setHealth(healthData);
          setDataStatus(statusData);
          setError(null);
          setLastRefresh(new Date());
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleReload = async () => {
    setReloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reload`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reload data");
      // Re-fetch status after reload
      const [healthRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/api/health`),
        fetch(`${API_BASE}/api/analytics/data-status`),
      ]);
      setHealth(healthRes.ok ? await healthRes.json() : null);
      setDataStatus(statusRes.ok ? await statusRes.json() : null);
      setLastRefresh(new Date());
    } catch (err) {
      alert("Error reloading data: " + err.message);
    } finally {
      setReloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  const isHealthy = health?.status === "healthy";
  const datasets = dataStatus?.datasets || {};

  const datasetMeta = [
    {
      key: "product_metrics",
      label: "Product Metrics",
      icon: BarChart2,
      color: "emerald",
      note: "Gold layer — join products + reviews",
    },
    {
      key: "sentiment",
      label: "Sentiment Analysis",
      icon: Activity,
      color: "sky",
      note: "ML pipeline — python -m ml.sentiment_analysis",
    },
    {
      key: "negative_topics",
      label: "Negative Topics",
      icon: FileText,
      color: "amber",
      note: "ML pipeline — python -m ml.topic_modeling",
    },
    {
      key: "price_history",
      label: "Price History",
      icon: Database,
      color: "rose",
      note: "Gold layer — price snapshot tracking",
    },
  ];

  const colorMap = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     dot: "bg-sky-500" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   dot: "bg-amber-500" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-600",    dot: "bg-rose-500" },
  };

  const formatLoadedAt = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitoring</h1>
          <p className="text-slate-500 mt-1 text-sm">Trạng thái hệ thống và dữ liệu Data Lakehouse</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Làm mới lúc {lastRefresh.toLocaleTimeString("vi-VN")}
            </span>
          )}
          <button
            id="btn-reload-data"
            onClick={handleReload}
            disabled={reloading || !isHealthy}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
            {reloading ? "Đang tải lại..." : "Reload Data"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Lỗi kết nối Backend: {error}</p>
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* API Health */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">API Status</p>
              <div className="flex items-center gap-2">
                <h3 className={`text-2xl font-bold ${isHealthy ? "text-emerald-600" : "text-red-600"}`}>
                  {isHealthy ? "Healthy" : "Down"}
                </h3>
                {isHealthy && (
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">FastAPI + Uvicorn</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHealthy ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}>
              {isHealthy ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
          </div>
        </div>

        {/* Products Loaded */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Products Loaded</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {(datasets.product_metrics?.rows || health?.total_products || 0).toLocaleString("vi-VN")}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Gold layer in-memory</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Dữ liệu cập nhật lúc</p>
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {formatLoadedAt(dataStatus?.loaded_at)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Kể từ lần load cuối</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Status Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600" />
          Trạng thái Dataset (Gold Layer)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasetMeta.map(({ key, label, icon: Icon, color, note }) => {
            const ds = datasets[key];
            const available = ds?.available ?? false;
            const rows = ds?.rows ?? 0;
            const c = colorMap[color];
            return (
              <div
                key={key}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  available ? "border-slate-100 bg-slate-50" : "border-amber-100 bg-amber-50/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${c.text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{note}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${available ? c.dot : "bg-amber-400"}`} />
                    <span className={`text-xs font-semibold ${available ? c.text : "text-amber-600"}`}>
                      {available ? "Available" : "Pending"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {rows.toLocaleString("vi-VN")} rows
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External Tools */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-emerald-600" />
          External Dashboards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <a
            href={host ? `http://${host}:3001` : "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3b/Grafana_icon.svg" alt="Grafana" className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">Grafana Dashboard</h4>
                <p className="text-sm text-slate-500">Live API metrics (Port 3001)</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </a>

          <a
            href={host ? `http://${host}:9090` : "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/38/Prometheus_software_logo.svg" alt="Prometheus" className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">Prometheus Server</h4>
                <p className="text-sm text-slate-500">Metrics scraper (Port 9090)</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}
