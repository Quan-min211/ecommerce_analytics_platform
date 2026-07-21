export default function PipelineLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 rounded-lg" />
      <div className="h-5 w-96 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-[420px] bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-72 bg-slate-100 rounded-2xl" />
        <div className="h-72 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  );
}
