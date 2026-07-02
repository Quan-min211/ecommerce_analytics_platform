"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Star, ArrowUpDown, Eye, MessageSquare, Download, RefreshCw } from "lucide-react";
import { getProducts } from "@/lib/api";
import ProductModal from "@/components/ProductModal";
import ReviewsModal from "@/components/ReviewsModal";

const SortHeader = ({ column, children, align = "left", sortBy, handleSort }) => (
  <th
    onClick={() => handleSort(column)}
    className={`text-${align} text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-4 px-3 cursor-pointer hover:text-emerald-600 transition-colors select-none`}
  >
    <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
      {children}
      <ArrowUpDown className={`w-3 h-3 ${sortBy === column ? "text-emerald-600" : ""}`} />
    </div>
  </th>
);

export default function ProductsPage() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, page_size: 15, total_pages: 0 });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("avg_rating");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewsTarget, setReviewsTarget] = useState(null);

  // Crawling States
  const [crawlKeyword, setCrawlKeyword] = useState("");
  const [crawlLimit, setCrawlLimit] = useState(100);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState("");

  const handleCrawl = async (limit) => {
    if (!crawlKeyword.trim()) return;
    setIsCrawling(true);
    setCrawlStatus(`Đang yêu cầu cào ${limit} sản phẩm...`);
    try {
      const res = await fetch("http://localhost:8001/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: crawlKeyword, limit })
      });
      if (res.ok) {
        setCrawlStatus("Hệ thống đang tự động mở Chrome và thu thập dữ liệu ngầm. Quá trình này sẽ mất 1-2 phút, danh sách sẽ tự động tải lại sau đó.");
        setTimeout(() => {
          setPage(1);
          setSearch("");
          setIsCrawling(false);
          setCrawlStatus("");
        }, 90000);
      } else {
        setCrawlStatus("Lỗi khi gọi Local Crawler Agent! Đảm bảo bạn đã chạy script crawler_agent.py.");
        setTimeout(() => setIsCrawling(false), 5000);
      }
    } catch (err) {
      setCrawlStatus("Không thể kết nối tới Local Crawler Agent ở port 8001.");
      setTimeout(() => setIsCrawling(false), 5000);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getProducts({ page, pageSize: 15, search, sortBy, sortOrder });
        if (!ignore) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { ignore = true; };
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };


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

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
            <p className="text-slate-500 mt-1 text-sm">{data.total} sản phẩm trong cơ sở dữ liệu</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Database Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm trong Database..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
              />
            </div>
            
            <div className="hidden sm:block w-px h-8 bg-slate-200 mx-2"></div>

            {/* Shopee Crawl */}
            <div className="flex items-center gap-2 w-full sm:w-auto bg-emerald-50 p-1.5 rounded-xl border border-emerald-200">
              <input
                type="text"
                placeholder="Tên SP để cào mới..."
                value={crawlKeyword}
                onChange={(e) => setCrawlKeyword(e.target.value)}
                className="w-full sm:w-48 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isCrawling}
              />
              <input
                type="number"
                min="1"
                placeholder="Số lượng..."
                value={crawlLimit}
                onChange={(e) => setCrawlLimit(e.target.value)}
                className="w-full sm:w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isCrawling}
              />
              <button
                onClick={() => handleCrawl(Number(crawlLimit) || 100)}
                disabled={isCrawling || !crawlKeyword.trim() || !crawlLimit || crawlLimit < 1}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
              >
                {isCrawling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Cào Dữ Liệu
              </button>
            </div>
          </div>
        </div>

        {isCrawling && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-amber-500 animate-spin shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-800 font-medium text-sm">Hệ thống đang hoạt động</h4>
              <p className="text-amber-700 text-xs mt-1">{crawlStatus}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-4 pl-5 pr-2 pt-4 w-12">#</th>
                  <SortHeader column="name" sortBy={sortBy} handleSort={handleSort}>Sản phẩm</SortHeader>
                  <SortHeader column="price" align="right" sortBy={sortBy} handleSort={handleSort}>Giá</SortHeader>
                  <SortHeader column="avg_rating" align="right" sortBy={sortBy} handleSort={handleSort}>Rating</SortHeader>
                  <SortHeader column="total_reviews" align="right" sortBy={sortBy} handleSort={handleSort}>Reviews</SortHeader>
                  <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-4 px-3 pt-4">Shop</th>
                  <th className="text-center text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-4 px-3 pt-4">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="p-4"><div className="skeleton h-6 w-full" /></td>
                      </tr>
                    ))
                  : data.data.map((product, index) => (
                      <tr key={product.product_id || index} className="hover:bg-emerald-50/30 transition-colors duration-150">
                        <td className="pl-5 pr-2 py-3.5 text-sm text-slate-400 font-mono">
                          {(page - 1) * 15 + index + 1}
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-sm text-slate-900 font-medium line-clamp-1 max-w-[280px]">
                            {product.name || "N/A"}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <span className="text-sm text-emerald-600 font-semibold">
                            {product.price ? `₫${Number(product.price).toLocaleString("vi-VN")}` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-sm text-slate-900 font-medium">
                              {product.avg_rating ? Number(product.avg_rating).toFixed(1) : "0"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm text-slate-500">
                          {product.total_reviews || 0}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            {product.shop_name || "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedProduct(product)}
                              title="Xem chi tiết"
                              className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReviewsTarget({ id: product.product_id, name: product.name })}
                              title="Xem bình luận"
                              className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Trang</span>
                <select
                  value={data.page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-900 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer hover:border-emerald-500/50 transition-colors"
                >
                  {Array.from({ length: data.total_pages }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <span>/ {data.total_pages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-emerald-500/30 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>
                <button
                  onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                  disabled={page >= data.total_pages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-emerald-500/30 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Tiếp <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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
