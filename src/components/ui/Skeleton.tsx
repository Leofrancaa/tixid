export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function RoomSkeleton({ code }: { code?: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-5">
      <div className="panel w-full p-6 text-center">
        <Skeleton className="mx-auto mb-3 h-3 w-24" />
        <Skeleton className="mx-auto mb-3 h-10 w-48" />
        <Skeleton className="mx-auto h-3 w-32" />
      </div>
      <div className="panel w-full p-5">
        <Skeleton className="mb-3 h-3 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      {code && (
        <p className="font-serif text-xs italic text-parchment/30">
          preparando sala {code}…
        </p>
      )}
    </main>
  );
}

export function RoundSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      {/* Top bar */}
      <header className="mb-4 flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </header>

      {/* Storyteller strip */}
      <div className="panel mb-4 px-4 py-3">
        <Skeleton className="mb-1.5 h-3 w-24" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Race track */}
      <div className="panel overflow-hidden">
        <div className="border-b border-dixit-gold/10 px-4 py-2.5">
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="p-3">
          <div
            className="gap-0.5"
            style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <Skeleton key={i} style={{ aspectRatio: "1" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ aspectRatio: "3 / 4" }} />
        ))}
      </div>

      <p className="mt-6 text-center font-serif text-xs italic text-parchment/25">
        carregando rodada…
      </p>
    </main>
  );
}
