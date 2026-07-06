import { Suspense } from "react";
import Link from "next/link";
import { loadCommunityFeed } from "@/lib/community/feed";
import { InfiniteFeed } from "@/components/community/InfiniteFeed";
import { FeedSkeleton } from "@/components/loading/Skeletons";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const TABS = [
  { value: "popular", label: "Popular" },
  { value: "reciente", label: "Reciente" },
] as const;

async function CommunityFeed({ activeTab }: { activeTab: string }) {
  const posts = await loadCommunityFeed(activeTab);

  if (posts.length === 0) {
    return (
      <div className="flex flex-1 flex-col px-[22px] py-4">
        <p className="py-10 text-center text-sm font-semibold text-muted">
          Todavía no hay publicaciones acá.
        </p>
      </div>
    );
  }

  return <InfiniteFeed initialPosts={posts} activeTab={activeTab} />;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "popular";

  return (
    <div className="flex min-h-full flex-col pt-[60px]">
      <div className="flex items-center px-[22px] pb-3">
        <span className="font-serif italic" style={{ fontSize: 34 }}>
          Comunidad
        </span>
      </div>

      <div className="flex gap-5 border-b border-line px-[22px]">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/community?tab=${t.value}`}
            className={`feed-tab ${activeTab === t.value ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Header y tabs pintan al instante; el feed llega por streaming. */}
      <Suspense key={activeTab} fallback={<FeedSkeleton />}>
        <CommunityFeed activeTab={activeTab} />
      </Suspense>

      <Link href="/community/publish" className="fab">
        <MaterialIcon name="add_a_photo" />
        Publicar
      </Link>
    </div>
  );
}
