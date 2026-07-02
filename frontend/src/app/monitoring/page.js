/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, RefreshCw, Server, Database, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

export default function MonitoringPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState(null);
  const [host, setHost] = useState("");

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/health`);
      if (!res.ok) throw new Error("Failed to fetch health status");
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) setHost(window.location.hostname);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchHealth]);

  const handleReload = async () => {
    setReloading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/reload`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reload data");
      await fetchHealth();
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
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isHealthy = health?.status === "healthy";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitoring</h1>
          <p className="text-slate-500 mt-1 text-sm">Trạng thái hệ thống và làm mới dữ liệu Data Lakehouse</p>
        </div>
        <button
          onClick={handleReload}
          disabled={reloading || !isHealthy}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
          {reloading ? "Đang tải lại..." : "Reload Data"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Lỗi kết nối Backend: {error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">API Status</p>
              <div className="flex items-center gap-2">
                <h3 className={`text-2xl font-bold ${isHealthy ? "text-emerald-600" : "text-red-600"}`}>
                  {isHealthy ? "Healthy" : "Down"}
                </h3>
                {isHealthy && <span className="flex h-3 w-3 rounded-full bg-emerald-500 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHealthy ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}>
              {isHealthy ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Products Loaded</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {health?.total_products ? health.total_products.toLocaleString("vi-VN") : "0"}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Reviews Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Reviews Loaded</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {health?.total_reviews ? health.total_reviews.toLocaleString("vi-VN") : "0"}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* External Monitoring Tools */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 mt-8">External Dashboards</h3>
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
