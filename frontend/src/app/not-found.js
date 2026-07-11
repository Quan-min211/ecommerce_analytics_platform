import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-[70vh] animate-fade-in">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-6xl font-black text-slate-200 tracking-tighter">404</h1>
        <h2 className="text-xl font-bold text-slate-900 -mt-2">Trang không tồn tại</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển. Hãy kiểm tra lại URL hoặc quay về Dashboard.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Home className="w-4 h-4" />
          Về Dashboard
        </a>
      </div>
    </div>
  );
}
