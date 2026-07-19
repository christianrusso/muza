"use server";

import { loadCommunityFeed } from "@/lib/community/feed";
import { loadVoteQueue, VOTE_QUEUE_SIZE, type VoteCardData } from "@/lib/community/votes";
import { FEED_PAGE_SIZE } from "@/lib/community/constants";
import type { PostCardData } from "@/components/community/PostCard";

/** Trae la siguiente tanda del feed para el scroll infinito. */
export async function loadMorePosts(activeTab: string, offset: number): Promise<PostCardData[]> {
  return loadCommunityFeed(activeTab, offset, FEED_PAGE_SIZE);
}

/**
 * Siguiente tanda del deck de votación. `recentPostIds` es la ventana de lo ya
 * mostrado en esta sesión (no todo el historial): evita repetir de cerca sin
 * llegar nunca a vaciar la cola.
 */
export async function loadMoreVoteCards(recentPostIds: string[]): Promise<VoteCardData[]> {
  return loadVoteQueue(VOTE_QUEUE_SIZE, recentPostIds);
}
