/** Loading placeholders that mirror the shape of the content they stand in for. */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonPanel({ lines = 3, className = '' }) {
  return (
    <div className={`glass space-y-3 p-6 ${className}`} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 ? 'w-4/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 3, className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3', item = 'h-36' }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => <div key={i} className={`skeleton rounded-2xl ${item}`} />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-64" />
      <SkeletonGrid count={4} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" item="h-28" />
      <SkeletonPanel lines={5} />
    </main>
  );
}
