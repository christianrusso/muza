-- community_feed_view was created with security_invoker = true, which means
-- it enforces the querying user's RLS on the underlying `analyses` table
-- (owner-only select). That defeats the view's whole purpose: it should run
-- with the view owner's privileges so any authenticated user can see
-- published posts, regardless of who owns the underlying analysis.
alter view public.community_feed_view set (security_invoker = false);
