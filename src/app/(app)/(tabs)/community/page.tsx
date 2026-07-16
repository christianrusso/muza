import { Suspense } from "react";
import Link from "next/link";
import { loadCommunityFeed } from "@/lib/community/feed";
import { loadVoteQueue } from "@/lib/community/votes";
import { unreadActivityCount } from "@/lib/community/activity";
import { normalizeTab } from "@/lib/community/constants";
import { isViewerAuthed } from "@/lib/viewer";
import { InfiniteFeed } from "@/components/community/InfiniteFeed";
import { VoteDeck } from "@/components/community/VoteDeck";
import { CommunityTabs } from "@/components/community/CommunityTabs";
import { PublishFab } from "@/components/community/PublishFab";
import { FeedSkeleton } from "@/components/loading/Skeletons";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

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
  // Un invitado siempre cae en "Votá": ve el deck pero no puede votar, y
  // "Siguiendo" sin sesión saldría vacía (ver normalizeTab).
  const isAuthed = await isViewerAuthed();
  const activeTab = normalizeTab(tab, isAuthed);
  const activityBadge = await unreadActivityCount();

  return (
    <div className="flex min-h-full flex-col pt-[60px]">
      <div className="flex items-center justify-between px-[22px] pb-3">
        <span className="font-serif italic" style={{ fontSize: 34 }}>
          Comunidad
        </span>
        {/* La actividad es una bandeja personal: al invitado le escondemos el
            ícono en vez de gatearlo, porque no tendría nada adentro. */}
        {isAuthed && (
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
        )}
      </div>

      <CommunityTabs activeTab={activeTab} />

      {/* Header y tabs pintan al instante; el contenido llega por streaming. */}
      <Suspense key={activeTab} fallback={<FeedSkeleton />}>
        {activeTab === "vota" ? <VoteTab /> : <FollowingFeed />}
      </Suspense>

      {/* En "Votá" la carta llena el alto y el FAB taparía los botones de voto;
          se muestra solo en los feeds. */}
      {activeTab !== "vota" && <PublishFab />}
    </div>
  );
}
