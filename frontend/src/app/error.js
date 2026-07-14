"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  return (
    <div className="flex items-center justify-center h-[70vh] animate-fade-in">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Đã có lỗi xảy ra</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Ứng dụng gặp lỗi không mong muốn. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
        </p>
        {error?.message && (
          <p className="text-xs text-red-400 bg-red-50 p-3 rounded-xl border border-red-100 font-mono">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
