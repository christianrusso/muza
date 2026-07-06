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

// Skeleton de segmento (loading.tsx) para Home: header + card de último score +
// stats. No busca precisión de pixel, solo ocupar el espacio al instante.
export function HomeSkeleton() {
  return (
    <div className="screen-body pad-tab animate-pulse" style={{ gap: 18 }} aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="ph h-2.5 w-28 rounded" />
          <div className="ph h-6 w-40 rounded" />
        </div>
        <div className="ph h-[46px] w-[46px] rounded-full" />
      </div>
      <div className="ph h-[172px] w-full rounded-2xl" />
      <div className="flex gap-3">
        <div className="ph h-[84px] flex-1 rounded-2xl" />
        <div className="ph h-[84px] flex-1 rounded-2xl" />
      </div>
      <div className="ph h-[68px] w-full rounded-2xl" />
    </div>
  );
}

// Skeleton de segmento para Perfil: avatar + nombre + stats + grilla de posts.
export function ProfileSkeleton() {
  return (
    <div className="screen-body pad-tab animate-pulse" style={{ gap: 18 }} aria-hidden>
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="ph h-[84px] w-[84px] rounded-full" />
        <div className="ph h-5 w-36 rounded" />
        <div className="ph h-3 w-24 rounded" />
      </div>
      <div className="flex gap-3">
        <div className="ph h-[70px] flex-1 rounded-2xl" />
        <div className="ph h-[70px] flex-1 rounded-2xl" />
        <div className="ph h-[70px] flex-1 rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 gap-[13px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ph w-full rounded-2xl" style={{ aspectRatio: "3/4" }} />
        ))}
      </div>
    </div>
  );
}

// Skeleton de segmento para el Resultado del análisis: ring + desglose.
export function ResultSkeleton() {
  return (
    <div className="screen-body pad animate-pulse flex flex-col items-center gap-6 pt-10" aria-hidden>
      <div className="ph h-[180px] w-[180px] rounded-full" />
      <div className="ph h-4 w-40 rounded" />
      <div className="flex w-full flex-col gap-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ph h-12 w-full rounded-xl" />
        ))}
      </div>
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
