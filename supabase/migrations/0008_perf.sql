-- Muza — performance
-- community_feed_view cuenta likes/dislikes con subconsultas correlacionadas
-- sobre post_reactions; este índice acelera esos conteos por post.

create index if not exists post_reactions_post_id_reaction_idx
  on public.post_reactions (post_id, reaction);
