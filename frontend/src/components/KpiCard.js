"use client";

export default function KpiCard({ title, value, subtitle, icon: Icon, color = "emerald" }) {
  const colorMap = {
    emerald: { bg: "bg-white", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    teal:    { bg: "bg-white", iconBg: "bg-teal-50",    iconColor: "text-teal-600" },
    amber:   { bg: "bg-white", iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    rose:    { bg: "bg-white", iconBg: "bg-rose-50",     iconColor: "text-rose-600" },
    sky:     { bg: "bg-white", iconBg: "bg-sky-50",      iconColor: "text-sky-600" },
  };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`rounded-xl ${c.iconBg} p-2.5`}>
          {Icon && <Icon className={`w-5 h-5 ${c.iconColor}`} />}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>}
      </div>
    </div>
  );
}
