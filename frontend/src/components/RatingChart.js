"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#059669"];
const LABELS = ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star"];

export default function RatingChart({ data, height = 280, title = "Phân bố đánh giá", onBarClick }) {
  if (!data) return null;

  const chartData = [
    { name: LABELS[0], value: data.star_1 || 0 },
    { name: LABELS[1], value: data.star_2 || 0 },
    { name: LABELS[2], value: data.star_3 || 0 },
    { name: LABELS[3], value: data.star_4 || 0 },
    { name: LABELS[4], value: data.star_5 || 0 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-400">Total: {data.total || 0}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              color: "#0F172A",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            cursor={{ fill: "rgba(5, 150, 105, 0.06)" }}
          />
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]} 
            maxBarSize={48}
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(data, index) => onBarClick && onBarClick(index + 1)}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
