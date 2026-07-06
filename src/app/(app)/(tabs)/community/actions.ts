"use server";

import { loadCommunityFeed } from "@/lib/community/feed";
import { FEED_PAGE_SIZE } from "@/lib/community/constants";
import type { PostCardData } from "@/components/community/PostCard";

/** Trae la siguiente tanda del feed para el scroll infinito. */
export async function loadMorePosts(activeTab: string, offset: number): Promise<PostCardData[]> {
  return loadCommunityFeed(activeTab, offset, FEED_PAGE_SIZE);
}
