// Skeletons de carga para que header/tabs pinten al instante mientras las
// fotos llegan por streaming (Suspense). El `.ph` es la textura placeholder.

export function FeedSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5 px-[22px] py-4" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="ph h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <div className="ph h-3 w-24 rounded" />
              <div className="ph h-2.5 w-16 rounded" />
            </div>
          </div>
          <div className="ph w-full rounded-[18px]" style={{ aspectRatio: "4/5" }} />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ columns = 2, count = 6 }: { columns?: 2 | 3; count?: number }) {
  return (
    <div
      className={`grid flex-1 content-start gap-[13px] px-[22px] ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="ph w-full rounded-2xl" style={{ aspectRatio: "3/4" }} />
        </div>
      ))}
    </div>
  );
}
