-- Muza MVP — Row Level Security policies

alter table public.profiles enable row level security;
alter table public.occasions enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_categories enable row level security;
alter table public.analysis_feedback enable row level security;
alter table public.plan_usage enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;

-- profiles: any authenticated user can read (needed for author info in
-- community feed); only the owner can write.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- occasions: public read, no client writes (seeded via migration only).
create policy "occasions_select_all" on public.occasions
  for select using (true);

-- analyses / analysis_categories / analysis_feedback: owner-only.
-- Community visibility goes through community_feed_view, not by
-- relaxing these policies.
create policy "analyses_owner_select" on public.analyses
  for select to authenticated using (auth.uid() = user_id);
create policy "analyses_owner_insert" on public.analyses
  for insert to authenticated with check (auth.uid() = user_id);
create policy "analyses_owner_update" on public.analyses
  for update to authenticated using (auth.uid() = user_id);
create policy "analyses_owner_delete" on public.analyses
  for delete to authenticated using (auth.uid() = user_id);

create policy "analysis_categories_owner_select" on public.analysis_categories
  for select to authenticated using (
    exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );
create policy "analysis_categories_owner_insert" on public.analysis_categories
  for insert to authenticated with check (
    exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );

create policy "analysis_feedback_owner_select" on public.analysis_feedback
  for select to authenticated using (
    exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );
create policy "analysis_feedback_owner_insert" on public.analysis_feedback
  for insert to authenticated with check (
    exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );

-- plan_usage: owner can read their own usage; writes only happen through
-- the security-definer increment_analysis_usage() RPC (owned by the
-- migration role), so clients cannot forge quota counters directly.
create policy "plan_usage_owner_select" on public.plan_usage
  for select to authenticated using (auth.uid() = user_id);

-- community_posts: open read to any authenticated user; insert/delete
-- restricted to the owner, and the referenced analysis must also be theirs.
create policy "community_posts_select_authenticated" on public.community_posts
  for select to authenticated using (true);
create policy "community_posts_owner_insert" on public.community_posts
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );
create policy "community_posts_owner_delete" on public.community_posts
  for delete to authenticated using (auth.uid() = user_id);

-- post_reactions: open read; insert/update/delete restricted to own rows.
create policy "post_reactions_select_authenticated" on public.post_reactions
  for select to authenticated using (true);
create policy "post_reactions_owner_insert" on public.post_reactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "post_reactions_owner_update" on public.post_reactions
  for update to authenticated using (auth.uid() = user_id);
create policy "post_reactions_owner_delete" on public.post_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- post_comments: open read; insert restricted to self, delete own comments.
create policy "post_comments_select_authenticated" on public.post_comments
  for select to authenticated using (true);
create policy "post_comments_owner_insert" on public.post_comments
  for insert to authenticated with check (auth.uid() = user_id);
create policy "post_comments_owner_delete" on public.post_comments
  for delete to authenticated using (auth.uid() = user_id);

-- follows: open read (needed for "Siguiendo" feed + follow button state);
-- insert/delete restricted to the follower themself.
create policy "follows_select_authenticated" on public.follows
  for select to authenticated using (true);
create policy "follows_owner_insert" on public.follows
  for insert to authenticated with check (auth.uid() = follower_id);
create policy "follows_owner_delete" on public.follows
  for delete to authenticated using (auth.uid() = follower_id);
