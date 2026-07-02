"use client";

import { useEffect, useState } from "react";
import { X, Star, MessageSquare, User } from "lucide-react";
import { getProductReviews } from "@/lib/api";

export default function ReviewsModal({ productId, productName, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;
    async function fetchReviews() {
      try {
        const data = await getProductReviews(productId);
        setReviews(data.reviews || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [productId]);

  const renderStars = (rating) => {
    const stars = [];
    const r = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= r ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
        />
      );
    }
    return stars;
  };

  return (
    <div className="fixed inset-0 z-[100] modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bình luận</h2>
              <p className="text-xs text-slate-400 line-clamp-1">{productName || ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">Lỗi: {error}</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">Chưa có bình luận nào cho sản phẩm này.</p>
            </div>
          ) : (
            reviews.map((review, index) => (
              <div
                key={review.review_id || index}
                className="bg-slate-50 rounded-2xl p-4 animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Author & Rating */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {review.author_name || review.username || "Ẩn danh"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Sentiment Badge */}
                    {review.sentiment_label && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        review.sentiment_label === "positive"
                          ? "bg-emerald-50 text-emerald-600"
                          : review.sentiment_label === "negative"
                          ? "bg-red-50 text-red-500"
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          review.sentiment_label === "positive" ? "bg-emerald-500"
                            : review.sentiment_label === "negative" ? "bg-red-500"
                            : "bg-amber-500"
                        }`} />
                        {review.sentiment_label === "positive" ? "Tích cực"
                          : review.sentiment_label === "negative" ? "Tiêu cực"
                          : "Trung lập"}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5">
                      {renderStars(review.rating_star || review.rating)}
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                {(review.review_text || review.comment) && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {review.review_text || review.comment}
                  </p>
                )}

                {/* Timestamp */}
                {(review.created_at || review.review_time) && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    {new Date(review.created_at || review.review_time).toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <p className="text-center text-xs text-slate-400">
            {reviews.length > 0 ? `${reviews.length} bình luận` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
