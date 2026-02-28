function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800/60 ${className ?? ''}`} />;
}

export default function ComposerLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-80 mb-6" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-12 w-52 rounded-lg" />
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>
      </div>

      {/* Queue section skeleton */}
      <div className="mb-8">
        <Skeleton className="h-4 w-56 mb-3" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-800/60 bg-[#111113] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-14 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topics section skeleton */}
      <Skeleton className="h-4 w-64 mb-3" />
    </div>
  );
}
