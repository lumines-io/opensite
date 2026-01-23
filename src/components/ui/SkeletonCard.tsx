export function SkeletonCard() {
  return (
    <div className="p-3 bg-card border border-border rounded-lg animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-8" />
          </div>
        </div>
        <div className="h-3 bg-muted rounded w-12" />
      </div>
    </div>
  );
}
