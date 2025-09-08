export default function SkeletonCard() {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    </div>
  );
}