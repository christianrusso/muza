-- Muza MVP — community schema
-- community_posts, post_reactions, post_comments, follows

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  caption text,
  created_at timestamptz not null default now(),
  unique (analysis_id)
);

create index community_posts_created_at_idx on public.community_posts (created_at desc);

create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index post_comments_post_id_idx on public.post_comments (post_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- Read-only join view: exposes only what community posts need from the
-- otherwise owner-locked `analyses` table, so RLS on `analyses` never has
-- to be relaxed for other users to see published posts.
create view public.community_feed_view
with (security_invoker = true)
as
select
  cp.id as post_id,
  cp.caption,
  cp.created_at as posted_at,
  p.id as author_id,
  p.full_name as author_name,
  p.avatar_url as author_avatar_url,
  a.id as analysis_id,
  a.photo_path,
  a.occasion_id,
  a.analysis_type,
  a.overall_score,
  a.style_descriptors,
  (select count(*) from public.post_reactions r where r.post_id = cp.id and r.reaction = 'like') as like_count,
  (select count(*) from public.post_reactions r where r.post_id = cp.id and r.reaction = 'dislike') as dislike_count,
  (select count(*) from public.post_comments c where c.post_id = cp.id) as comment_count
from public.community_posts cp
join public.profiles p on p.id = cp.user_id
join public.analyses a on a.id = cp.analysis_id;
