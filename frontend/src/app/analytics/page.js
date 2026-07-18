"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getPriceVolatility, getRatingDistribution, getTopProducts } from "@/lib/api";
import RatingChart from "@/components/RatingChart";
import ProductModal from "@/components/ProductModal";
import ReviewsModal from "@/components/ReviewsModal";
import PriceVolatilityTable from "@/components/PriceVolatilityTable";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-slate-900 font-medium">{payload[0].payload.fullName}</p>
        <p className="text-xs text-emerald-600 mt-1 font-bold">
          {payload[0].name === "avg_rating" ? `Rating: ${payload[0].value}` : `Reviews: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [ratingDist, setRatingDist] = useState(null);
  const [topByRating, setTopByRating] = useState([]);
  const [topByReviews, setTopByReviews] = useState([]);
  const [priceVolatility, setPriceVolatility] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewsTarget, setReviewsTarget] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [rd, tr, tv, pv] = await Promise.all([
          getRatingDistribution(),
          getTopProducts("avg_rating", 10),
          getTopProducts("total_reviews", 10),
          getPriceVolatility(10, false),
        ]);
        setRatingDist(rd);
        setTopByRating(tr);
        setTopByReviews(tv);
        setPriceVolatility(pv);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-slate-900 font-semibold">Không thể tải dữ liệu</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-80 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="skeleton h-[420px] rounded-2xl" />
          <div className="skeleton h-[420px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const ratingChartData = topByRating
    .map((p) => ({
      name: (p.name || "").slice(0, 22) + ((p.name || "").length > 22 ? "…" : ""),
      avg_rating: Number(Number(p.avg_rating || 0).toFixed(1)),
      fullName: p.name,
      product: p,
    }))
    .reverse();

  const reviewsChartData = topByReviews
    .map((p) => ({
      name: (p.name || "").slice(0, 22) + ((p.name || "").length > 22 ? "…" : ""),
      total_reviews: p.total_reviews || 0,
      fullName: p.name,
      product: p,
    }))
    .reverse();


  const handleBarClick = (data) => {
    if (data?.product) setSelectedProduct(data.product);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-slate-500 mt-1 text-sm">Phân tích chuyên sâu dữ liệu sản phẩm Shopee</p>
        </div>

        <RatingChart data={ratingDist} height={300} title="Phân bố đánh giá tổng thể" />

        <PriceVolatilityTable
          items={priceVolatility}
          onClickProduct={(p) => setSelectedProduct(p)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top by Rating */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Top 10 — Rating cao nhất</h3>
            <p className="text-xs text-slate-400 mb-4">Nhấn vào cột để xem chi tiết sản phẩm</p>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={ratingChartData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_rating" radius={[0, 8, 8, 0]} maxBarSize={20} cursor="pointer" onClick={handleBarClick}>
                  {ratingChartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(155, ${50 + i * 3}%, ${38 + i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top by Reviews */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Top 10 — Nhiều Reviews nhất</h3>
            <p className="text-xs text-slate-400 mb-4">Nhấn vào cột để xem chi tiết sản phẩm</p>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={reviewsChartData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_reviews" radius={[0, 8, 8, 0]} maxBarSize={20} cursor="pointer" onClick={handleBarClick}>
                  {reviewsChartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(160, ${45 + i * 3}%, ${35 + i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onViewReviews={(pid) => {
            setReviewsTarget({ id: pid, name: selectedProduct.name });
            setSelectedProduct(null);
          }}
        />
      )}
      {reviewsTarget && (
        <ReviewsModal
          productId={reviewsTarget.id}
          productName={reviewsTarget.name}
          onClose={() => setReviewsTarget(null)}
        />
      )}
    </>
  );
}
