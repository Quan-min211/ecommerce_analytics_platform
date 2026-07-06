"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

export default function PriceVolatilityTable({ items = [], onClickProduct }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Biến động giá</h3>
        </div>
        <p className="text-sm text-slate-400">Chưa có đủ snapshot giá để phân tích.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Biến động giá mạnh</h3>
        </div>
        <span className="text-xs text-slate-400">Gold price_history</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Sản phẩm</th>
              <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Giá trước</th>
              <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Giá hiện tại</th>
              <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Thay đổi</th>
              <th className="text-center text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3">Cảnh báo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, index) => {
              const change = Number(item.price_change_pct || 0);
              const isDown = change < 0;
              const ChangeIcon = isDown ? TrendingDown : TrendingUp;
              return (
                <tr
                  key={`${item.product_id || index}-${item.scraped_at || index}`}
                  onClick={() => onClickProduct && onClickProduct(item)}
                  className={onClickProduct ? "hover:bg-emerald-50/40 cursor-pointer transition-colors" : ""}
                >
                  <td className="py-3 pr-3">
                    <p className="text-sm text-slate-900 font-medium line-clamp-1 max-w-[320px]">
                      {item.name || "N/A"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.scraped_date ? new Date(item.scraped_date).toLocaleDateString("vi-VN") : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-right text-sm text-slate-500">
                    {item.previous_price ? `₫${Number(item.previous_price).toLocaleString("vi-VN")}` : "N/A"}
                  </td>
                  <td className="py-3 pr-3 text-right text-sm font-semibold text-emerald-600">
                    {item.price ? `₫${Number(item.price).toLocaleString("vi-VN")}` : "N/A"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${isDown ? "text-rose-600" : "text-amber-600"}`}>
                      <ChangeIcon className="w-3.5 h-3.5" />
                      {change > 0 ? "+" : ""}{change.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    {item.is_discount_suspicious ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Sale ảo
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Bình thường</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
