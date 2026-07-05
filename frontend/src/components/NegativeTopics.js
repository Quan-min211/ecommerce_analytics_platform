"use client";

import { AlertTriangle, MessageSquare } from "lucide-react";

export default function NegativeTopics({ topics = [] }) {
  if (!topics || topics.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Phân tích Phàn nàn (AI)</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">Chưa có đủ dữ liệu đánh giá tiêu cực.</p>
        </div>
      </div>
    );
  }

  // Lấy count lớn nhất để tính % chiều dài bar
  const maxCount = Math.max(...topics.map((t) => t.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Top Lý do Phàn nàn</h3>
        </div>
        <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
          Trích xuất bởi AI
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {topics.map((item, idx) => {
          const pct = Math.round((item.count / maxCount) * 100);
          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700 font-medium capitalize truncate pr-4">
                  "{item.topic}"
                </span>
                <span className="text-slate-400 text-xs font-semibold shrink-0">
                  {item.count} lượt
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-500 group-hover:bg-rose-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
