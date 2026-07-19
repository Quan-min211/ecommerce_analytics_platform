export default function MonitoringLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}
