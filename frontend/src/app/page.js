"use client";

import { useEffect, useState } from "react";
import { Package, Star, MessageSquare, Hash, Tag, AlertTriangle, Download } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import RatingChart from "@/components/RatingChart";
import SentimentChart from "@/components/SentimentChart";
import TopProductsTable from "@/components/TopProductsTable";
import ScatterChart from "@/components/ScatterChart";
import ProductModal from "@/components/ProductModal";
import ReviewsModal from "@/components/ReviewsModal";
import NegativeTopics from "@/components/NegativeTopics";
import { getOverview, getRatingDistribution, getTopProducts, getSentimentOverview, getKeywordStats, getNegativeTopics } from "@/lib/api";

// Bảng màu xoay vòng cho các keyword cards — no violet (too close to AI purple)
const KEYWORD_COLORS = [
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-600", accent: "#059669" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", badge: "bg-sky-100 text-sky-600", accent: "#0284C7" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-600", accent: "#D97706" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-100 text-rose-600", accent: "#E11D48" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", badge: "bg-teal-100 text-teal-600", accent: "#0D9488" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", badge: "bg-cyan-100 text-cyan-600", accent: "#0891B2" },
];

export default function OverviewPage() {
  const [overview, setOverview] = useState(null);
  const [ratingDist, setRatingDist] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [negativeTopics, setNegativeTopics] = useState([]);
  const [keywordStats, setKeywordStats] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewsTarget, setReviewsTarget] = useState(null);

  // Filter state
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterPrice, setFilterPrice] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({ keyword: null, min_price: null, max_price: null });

  const toggleKeyword = (kw) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleApplyFilter = () => {
    const priceMap = {
      all: { min_price: null, max_price: null },
      under_100k: { min_price: null, max_price: 100000 },
      "100k_500k": { min_price: 100000, max_price: 500000 },
      over_500k: { min_price: 500000, max_price: null },
    };
    const priceRange = priceMap[filterPrice] || priceMap.all;
    setAppliedFilters({
      keyword: filterKeyword || null,
      ...priceRange,
    });
  };

  const handleResetFilter = () => {
    setFilterKeyword("");
    setFilterPrice("all");
    setAppliedFilters({ keyword: null, min_price: null, max_price: null });
  };

  const hasActiveFilter = appliedFilters.keyword || appliedFilters.min_price !== null || appliedFilters.max_price !== null;

  const handleExportCSV = () => {
    if (!topProducts || topProducts.length === 0) return;

    const headers = ["Tên sản phẩm", "Từ khóa", "Giá (VNĐ)", "Rating TB", "Tổng đánh giá", "Đã bán", "URL"];
    const rows = topProducts.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.keyword || "").replace(/"/g, '""')}"`,
      p.price || 0,
      (p.avg_rating || 0).toFixed(2),
      p.total_reviews || 0,
      p.sold_count || 0,
      `"${p.url || ""}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopee_products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Retry trigger — incrementing this causes the effect to re-run
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRetry = () => setRefreshTrigger((n) => n + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ov, rd, tp, sm, ks, nt] = await Promise.all([
          getOverview(appliedFilters),
          getRatingDistribution(),
          getTopProducts("avg_rating", 30, appliedFilters),
          getSentimentOverview(),
          getKeywordStats(),
          getNegativeTopics(),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setRatingDist(rd);
          setTopProducts(tp);
          setSentiment(sm);
          setKeywordStats(ks);
          setNegativeTopics(nt);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [appliedFilters, refreshTrigger]);

  if (error) {
    const isNetwork = error.isNetworkError;
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {isNetwork ? "Không thể kết nối Backend" : "Lỗi tải dữ liệu"}
          </h2>
          <p className="text-slate-500 text-sm max-w-md">
            {isNetwork ? (
              <>Hãy đảm bảo Backend API đang chạy tại{" "}<code className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">localhost:8000</code></>
            ) : (
              error.message || "Có lỗi xảy ra khi tải dữ liệu."
            )}
          </p>
          {error.errorId && (
            <p className="text-xs text-slate-400">Error ID: {error.errorId}</p>
          )}
          <button
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="skeleton h-8 w-52" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-slate-500 mt-1 text-sm">Tổng quan dữ liệu thương mại điện tử Shopee</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              disabled={topProducts.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất CSV
            </button>
            <div className="text-xs text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100">
              {new Date().toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Keyword Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Từ khóa:</span>
              <select
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
              >
                <option value="">Tất cả từ khóa</option>
                {keywordStats.map((kw) => (
                  <option key={kw.keyword} value={kw.keyword}>{kw.keyword} ({kw.total_products})</option>
                ))}
              </select>
            </div>
            <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
            {/* Price Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Khoảng giá:</span>
              <select
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
              >
                <option value="all">Tất cả mức giá</option>
                <option value="under_100k">Dưới 100k</option>
                <option value="100k_500k">100k - 500k</option>
                <option value="over_500k">Trên 500k</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilter && (
              <button
                onClick={handleResetFilter}
                className="text-xs font-semibold text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
            <button
              onClick={handleApplyFilter}
              className="text-xs font-semibold text-white bg-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </div>

        {/* Active Filter Badge */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Bộ lọc đang áp dụng:</span>
            {appliedFilters.keyword && (
              <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
                {appliedFilters.keyword}
              </span>
            )}
            {(appliedFilters.min_price !== null || appliedFilters.max_price !== null) && (
              <span className="bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-200 font-medium">
                {appliedFilters.min_price && !appliedFilters.max_price ? `Từ ₫${appliedFilters.min_price.toLocaleString("vi-VN")}` :
                 !appliedFilters.min_price && appliedFilters.max_price ? `Dưới ₫${appliedFilters.max_price.toLocaleString("vi-VN")}` :
                 `₫${appliedFilters.min_price?.toLocaleString("vi-VN")} - ₫${appliedFilters.max_price?.toLocaleString("vi-VN")}`}
              </span>
            )}
          </div>
        )}

        {/* Tổng quan KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
          <KpiCard
            title="Tổng sản phẩm"
            value={overview?.total_products?.toLocaleString("vi-VN") || "0"}
            icon={Package}
            color="emerald"
            subtitle={`Từ ${overview?.total_keywords || 0} từ khóa`}
          />
          <KpiCard
            title="Từ khóa đã cào"
            value={overview?.total_keywords || 0}
            icon={Hash}
            color="teal"
            subtitle={keywordStats.slice(0, 3).map(k => k.keyword).join(", ") || "—"}
          />
          <KpiCard
            title="Rating trung bình"
            value={`${(overview?.avg_rating || 0).toFixed(2)} ★`}
            icon={Star}
            color="amber"
            subtitle="Dựa trên toàn bộ sản phẩm"
          />
          <KpiCard
            title="Tổng đánh giá"
            value={(overview?.total_reviews || 0).toLocaleString("vi-VN")}
            icon={MessageSquare}
            color="rose"
            subtitle={`TB ${Math.round((overview?.total_reviews || 0) / Math.max(overview?.total_products || 1, 1))} đánh giá/sản phẩm`}
          />
        </div>

        {/* ======= THỐNG KÊ THEO TỪNG TỪ KHÓA ======= */}
        {keywordStats.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                Thống kê theo từ khóa
              </h2>
              <span className="text-xs text-slate-400">
                {selectedKeywords.length === 0
                  ? "Chọn từ khóa bên dưới để hiển thị"
                  : `Đang hiện ${selectedKeywords.length} / ${keywordStats.length} từ khóa`}
              </span>
            </div>

            {/* Keyword Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {keywordStats.map((kw, idx) => {
                const isActive = selectedKeywords.includes(kw.keyword);
                const color = KEYWORD_COLORS[idx % KEYWORD_COLORS.length];
                return (
                  <button
                    key={kw.keyword}
                    onClick={() => toggleKeyword(kw.keyword)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                      isActive
                        ? `${color.badge} ${color.border} shadow-sm`
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    {kw.keyword}
                    <span className="ml-1.5 text-xs opacity-70">({kw.total_products})</span>
                  </button>
                );
              })}
            </div>

            {/* Keyword Cards Grid */}
            {selectedKeywords.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {keywordStats
                .filter((kw) => selectedKeywords.includes(kw.keyword))
                .map((kw) => {
                const origIdx = keywordStats.findIndex((k) => k.keyword === kw.keyword);
                const color = KEYWORD_COLORS[origIdx % KEYWORD_COLORS.length];
                const rd = kw.rating_distribution || {};
                const starData = [
                  { label: "1", value: rd.star_1 || 0, color: "#EF4444" },
                  { label: "2", value: rd.star_2 || 0, color: "#F97316" },
                  { label: "3", value: rd.star_3 || 0, color: "#EAB308" },
                  { label: "4", value: rd.star_4 || 0, color: "#22C55E" },
                  { label: "5", value: rd.star_5 || 0, color: "#059669" },
                ];
                const maxStar = Math.max(...starData.map(s => s.value), 1);

                return (
                  <div
                    key={kw.keyword}
                    className={`${color.bg} ${color.border} border rounded-2xl p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
                  >
                    {/* Keyword Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`${color.badge} text-sm font-bold px-3 py-1 rounded-full`}>
                        {kw.keyword}
                      </span>
                      <span className="text-xs text-slate-400">
                        {kw.total_products} sản phẩm
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          ₫{(kw.avg_price || 0).toLocaleString("vi-VN")}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Giá TB</p>
                      </div>
                      <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {(kw.avg_rating || 0).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Rating TB</p>
                      </div>
                      <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {(kw.total_reviews || 0).toLocaleString("vi-VN")}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Đánh giá</p>
                      </div>
                    </div>

                    {/* Mini Rating Distribution Bar */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500">Phân bố đánh giá</p>
                      {starData.map((star) => (
                        <div key={star.label} className="flex items-center gap-2">
                          <span className="text-[10px] w-4 text-slate-500 text-right">{star.label}</span>
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          <div className="flex-1 bg-white/60 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(star.value / maxStar) * 100}%`,
                                backgroundColor: star.color,
                                minWidth: star.value > 0 ? "4px" : "0px",
                              }}
                            />
                          </div>
                          <span className="text-[10px] w-8 text-slate-400">{star.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RatingChart 
            data={ratingDist} 
            height={280} 
            title="Phân bố đánh giá (Tổng) — Click để lọc" 
            onBarClick={(star) => setRatingFilter(prev => prev === star ? null : star)}
          />
          <SentimentChart data={sentiment} />
          
          {/* Scatter Chart - spans 1 */}
          <ScatterChart 
            data={topProducts.filter(p => p.price && p.avg_rating && p.total_reviews).map(p => ({
              name: p.name, price: p.price, rating: p.avg_rating, reviews: p.total_reviews
            }))} 
          />
          
          {/* Negative Topics - spans 1 */}
          <NegativeTopics topics={negativeTopics} />

          {/* Top Products Table - spans full width */}
          <div className="lg:col-span-2">
            <TopProductsTable
              products={topProducts
                .filter(p => !ratingFilter || Math.round(p.avg_rating || 0) === ratingFilter)
                .slice(0, 5)}
              title={ratingFilter ? `Top 5 sản phẩm (${ratingFilter} Star)` : "Top 5 sản phẩm — Rating"}
              onClickProduct={(p) => setSelectedProduct(p)}
            />
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
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

      {/* Reviews Modal */}
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
