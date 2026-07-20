import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER, DEMO_COMMUNITY_POSTS } from "@/lib/demo";
import {
  getDemoStore,
  isDemoBlockedBetween,
  listDemoBlockedUsers,
  setDemoUserBlocked,
} from "@/lib/demoStore";

export interface BlockedUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export async function setUserBlocked(targetId: string, blocked: boolean) {
  if (isDemoMode()) {
    if (targetId === DEMO_USER.id) throw new Error("CANNOT_BLOCK_SELF");
    return {
      userId: targetId,
      blocked: setDemoUserBlocked(targetId, blocked, DEMO_USER.id),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_user_blocked", {
    p_blocked_id: targetId,
    p_blocked: blocked,
  });
  if (error) throw new Error(error.message);
  const result = data as { userId?: string; blocked?: boolean } | null;
  return {
    userId: result?.userId ?? targetId,
    blocked: Boolean(result?.blocked),
  };
}

export async function loadBlockedUsers(): Promise<BlockedUser[]> {
  if (isDemoMode()) {
    return listDemoBlockedUsers(DEMO_USER.id).flatMap((h) => {
      const seeded = h.blockedId === "demo-martina" ? "Martina R." : h.blockedId === "demo-tomas" ? "Tomás L." : "Usuario";
      return [{ userId: h.blockedId, name: seeded, avatarUrl: null, blockedAt: h.blockedAt }];
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_blocked_users");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { user_id: string; name: string; avatar_url: string | null; blocked_at: string }[]).map(
    (row) => ({
      userId: row.user_id,
      name: row.name ?? "Usuario",
      avatarUrl: row.avatar_url,
      blockedAt: row.blocked_at,
    }),
  );
}

export async function isBlockedWith(targetId: string, userId?: string): Promise<boolean> {
  if (isDemoMode()) return isDemoBlockedBetween(userId ?? DEMO_USER.id, targetId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_blocked_with", { p_target_id: targetId });
  return error ? false : Boolean(data);
}

export async function isPostBlocked(postId: string): Promise<boolean> {
  if (isDemoMode()) {
    const created = getDemoStore().posts.get(postId);
    const seeded = DEMO_COMMUNITY_POSTS.find((p) => p.post_id === postId);
    const authorId = created ? DEMO_USER.id : seeded?.author_id;
    return authorId ? isDemoBlockedBetween(DEMO_USER.id, authorId) : false;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_post_blocked", { p_post_id: postId });
  return error ? false : Boolean(data);
}
