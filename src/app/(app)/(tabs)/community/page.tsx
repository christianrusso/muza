import { Suspense } from "react";
import Link from "next/link";
import { loadCommunityFeed } from "@/lib/community/feed";
import { loadVoteQueue } from "@/lib/community/votes";
import { unreadActivityCount } from "@/lib/community/activity";
import { normalizeTab } from "@/lib/community/constants";
import { InfiniteFeed } from "@/components/community/InfiniteFeed";
import { VoteDeck } from "@/components/community/VoteDeck";
import { FeedSkeleton } from "@/components/loading/Skeletons";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const TABS = [
  { value: "vota", label: "Votá" },
  { value: "siguiendo", label: "Siguiendo" },
] as const;

async function VoteTab() {
  const queue = await loadVoteQueue();
  return <VoteDeck initialQueue={queue} />;
}

async function FollowingFeed() {
  const posts = await loadCommunityFeed("siguiendo");

  if (posts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-[22px] py-20 text-center">
        <p className="text-lg font-extrabold text-ink">Todavía no seguís a nadie.</p>
        <p className="mt-1.5 text-sm font-semibold text-muted">
          Votá algunos looks y seguí a quienes te gusten.
        </p>
        <Link
          href="/community?tab=vota"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-coral px-6 text-sm font-extrabold text-white"
        >
          Ir a Votá
        </Link>
      </div>
    );
  }

  return <InfiniteFeed initialPosts={posts} activeTab="siguiendo" />;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = normalizeTab(tab);
  const activityBadge = await unreadActivityCount();

  return (
    <div className="flex min-h-full flex-col pt-[60px]">
      <div className="flex items-center justify-between px-[22px] pb-3">
        <span className="font-serif italic" style={{ fontSize: 34 }}>
          Comunidad
        </span>
        <Link
          href="/community/activity"
          aria-label="Actividad"
          className="relative flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--paper-2, rgba(20,18,16,.05))" }}
        >
          <MaterialIcon name="favorite" size={22} />
          {activityBadge > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-paper" />
          )}
        </Link>
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

      {/* Header y tabs pintan al instante; el contenido llega por streaming. */}
      <Suspense key={activeTab} fallback={<FeedSkeleton />}>
        {activeTab === "vota" ? <VoteTab /> : <FollowingFeed />}
      </Suspense>

      {/* En "Votá" la carta llena el alto y el FAB taparía los botones de voto;
          se muestra solo en el feed "Siguiendo". */}
      {activeTab !== "vota" && (
        <Link href="/community/publish" className="fab">
          <MaterialIcon name="add_a_photo" />
          Publicar
        </Link>
      )}
    </div>
  );
}
