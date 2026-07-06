"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard, type PostCardData } from "@/components/community/PostCard";
import { loadMorePosts } from "@/app/(app)/(tabs)/community/actions";
import { FEED_PAGE_SIZE } from "@/lib/community/constants";

/**
 * Feed con scroll infinito: arranca con los primeros posteos renderizados en el
 * servidor y pide de a `FEED_PAGE_SIZE` más cuando el sentinela entra en viewport.
 */
export function InfiniteFeed({
  initialPosts,
  activeTab,
}: {
  initialPosts: PostCardData[];
  activeTab: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialPosts.length < FEED_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = await loadMorePosts(activeTab, posts.length);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.id))];
      });
      if (next.length < FEED_PAGE_SIZE) setDone(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeTab, posts.length, done]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

  return (
    <div className="flex flex-1 flex-col gap-5 px-[22px] py-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {!done && <div ref={sentinelRef} className="h-1" aria-hidden />}
      {loading && (
        <div className="flex justify-center py-4" aria-hidden>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-transparent" />
        </div>
      )}
    </div>
  );
}
