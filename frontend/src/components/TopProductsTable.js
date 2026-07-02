"use client";

import { Star, Download } from "lucide-react";

export default function TopProductsTable({ products, title = "Top sản phẩm", onClickProduct }) {
  const handleExportCSV = () => {
    if (!products || products.length === 0) return;
    
    const headers = ["Tên sản phẩm", "Shop", "Giá", "Rating", "Đánh giá"];
    const csvRows = [headers.join(",")];
    
    products.forEach(p => {
      const name = `"${(p.name || "").replace(/"/g, '""')}"`;
      const shop = `"${(p.shop_name || "").replace(/"/g, '""')}"`;
      const price = p.price || 0;
      const rating = p.avg_rating || 0;
      const reviews = p.total_reviews || 0;
      csvRows.push([name, shop, price, rating, reviews].join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "top_products.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Chưa có dữ liệu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button 
          onClick={handleExportCSV}
          className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
          title="Tải xuống CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">#</th>
              <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Sản phẩm</th>
              <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Giá</th>
              <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3 pr-3">Rating</th>
              <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider pb-3">Reviews</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map((product, index) => (
              <tr
                key={product.product_id || index}
                onClick={() => onClickProduct && onClickProduct(product)}
                className={`hover:bg-emerald-50/50 transition-colors duration-150 ${onClickProduct ? "cursor-pointer" : ""}`}
              >
                <td className="py-3 pr-3">
                  <span className={`text-xs font-bold ${
                    index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-slate-300"
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <p className="text-sm text-slate-900 font-medium line-clamp-1 max-w-[200px]">
                    {product.name || "N/A"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{product.shop_name || ""}</p>
                </td>
                <td className="py-3 pr-3 text-right">
                  <span className="text-sm text-emerald-600 font-semibold">
                    {product.price ? `₫${Number(product.price).toLocaleString("vi-VN")}` : "—"}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm text-slate-900 font-medium">
                      {product.avg_rating ? Number(product.avg_rating).toFixed(1) : "0"}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm text-slate-500">{product.total_reviews || 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
