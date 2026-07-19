import Link from "next/link";
import { Github, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-6 mt-auto">
      <div className="max-w-screen-2xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-2 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} HCMUTE Data Analytics Project.</p>
          <span className="hidden md:inline text-slate-300">|</span>
          <p>Phiên bản 1.0.0</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </Link>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <Code2 className="w-4 h-4" />
            <span>Architecture</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
