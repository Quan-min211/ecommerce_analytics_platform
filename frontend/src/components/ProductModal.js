"use client";

import { X, Star, MapPin, Store, Tag, ExternalLink } from "lucide-react";

export default function ProductModal({ product, onClose, onViewReviews }) {
  if (!product) return null;

  const details = [
    { label: "Mã sản phẩm", value: product.product_id, icon: Tag },
    { label: "Cửa hàng", value: product.shop_name, icon: Store },
    { label: "Địa điểm", value: product.location, icon: MapPin },
    { label: "Đã bán", value: product.sold_count, icon: null },
    { label: "Giảm giá", value: product.discount || "Không", icon: null },
  ];

  return (
    <div className="fixed inset-0 z-[100] modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{product.name || "Sản phẩm"}</h2>
            <p className="text-sm text-slate-400 mt-1">{product.shop_name || ""}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Price & Rating Hero */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Giá</p>
              <p className="text-3xl font-bold text-emerald-600">
                {product.price ? `₫${Number(product.price).toLocaleString("vi-VN")}` : "—"}
              </p>
            </div>
            <div className="w-px h-12 bg-slate-100" />
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Rating</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {product.avg_rating ? Number(product.avg_rating).toFixed(1) : "0"}
                </span>
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Star Breakdown */}
        <div className="px-6 pb-4">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Phân bố đánh giá</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = product[`star_${star}_count`] || 0;
                const total = product.total_reviews || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-right text-slate-500 font-medium">{star}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-400 text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">
              Tổng {product.total_reviews || 0} đánh giá
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 pb-4">
          <div className="space-y-3">
            {details.map(({ label, value, icon: DetailIcon }) =>
              value ? (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    {DetailIcon && <DetailIcon className="w-3.5 h-3.5" />}
                    {label}
                  </span>
                  <span className="text-slate-900 font-medium">{value}</span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={() => onViewReviews && onViewReviews(product.product_id)}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" />
            Xem bình luận ({product.total_reviews || 0})
          </button>
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
