"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, BarChart3, Activity, TrendingUp } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/70 shadow-sm">
      <div className="max-w-screen-2xl mx-auto h-full px-6 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform duration-200">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-bold text-slate-900 tracking-tight leading-none block">
              Analytics
            </span>
            <span className="text-[10px] text-slate-400 leading-none">E-Commerce Platform</span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:block">{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side — Data source badge */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-600">Shopee VN</span>
            <span className="text-xs text-slate-400">· Parquet</span>
          </div>
        </div>

      </div>
    </header>
  );
}
