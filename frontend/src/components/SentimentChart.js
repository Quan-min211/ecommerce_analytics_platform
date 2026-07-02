"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const COLORS = {
  positive: "#059669",
  negative: "#DC2626",
  neutral: "#D97706",
};

const LABELS = {
  positive: "Tích cực",
  negative: "Tiêu cực",
  neutral: "Trung lập",
};

const ICONS = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
};

const CustomTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const pct = ((d.value / total) * 100).toFixed(1);
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
        <p className="text-sm font-medium text-slate-900">
          {d.label}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {d.value} reviews ({pct}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function SentimentChart({ data, height = 260 }) {
  if (!data || data.total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Phân tích cảm xúc</h3>
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-slate-400">Chưa có dữ liệu sentiment. Chạy ML pipeline trước.</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: "positive", label: LABELS.positive, value: data.positive || 0 },
    { name: "negative", label: LABELS.negative, value: data.negative || 0 },
    { name: "neutral", label: LABELS.neutral, value: data.neutral || 0 },
  ].filter((d) => d.value > 0);


  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">Phân tích cảm xúc</h3>
        <span className="text-xs text-slate-400">{data.total} reviews</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="w-[180px] h-[180px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={data.total} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{data.positive_pct}%</span>
            <span className="text-[10px] text-slate-400">Tích cực</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {[
            { key: "positive", count: data.positive, pct: data.positive_pct },
            { key: "negative", count: data.negative, pct: data.negative_pct },
            { key: "neutral", count: data.neutral, pct: data.neutral_pct },
          ].map(({ key, count, pct }) => {
            const SentIcon = ICONS[key];
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[key] }}
                  />
                  <SentIcon className="w-3.5 h-3.5" style={{ color: COLORS[key] }} />
                  <span className="text-sm text-slate-600">{LABELS[key]}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                  <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
