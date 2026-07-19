export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-80 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="skeleton h-[420px] rounded-2xl" />
        <div className="skeleton h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}
