export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="skeleton h-14 rounded-2xl" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    </div>
  );
}
