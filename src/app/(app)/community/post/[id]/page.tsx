import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedPhotoUrl } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_USER, DEMO_COMMUNITY_POSTS } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { ScreenHead } from "@/components/navigation/TopBar";
import { PostCard, type PostCardData } from "@/components/community/PostCard";
import { PostVotePanel } from "@/components/community/PostVotePanel";
import { CommentForm } from "@/components/community/CommentForm";
import { DeletePostButton } from "@/components/community/DeletePostButton";
import type { VoteBucket, VoteTally } from "@/lib/community/constants";
import type { OccasionId } from "@/types/domain";

interface PostDetail {
  post: PostCardData;
  comments: { id: string; body: string; author: string }[];
  isMine: boolean;
  isAuthed: boolean;
  aiScore: number;
  myBucket: VoteBucket | null;
  tally: VoteTally;
}

async function loadPost(id: string): Promise<PostDetail | null> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const myBucket = (store.votes.get(id) as VoteBucket | undefined) ?? null;
    const tally: VoteTally = { low: 0, mid: 0, high: 0 };
    if (myBucket) tally[myBucket] = 1;

    const created = store.posts.get(id);
    if (created) {
      const analysis = store.analyses.get(created.analysisId);
      const aiScore = analysis?.overallScore ?? 0;
      return {
        post: {
          id: created.id,
          authorId: DEMO_USER.id,
          authorName: DEMO_USER.full_name,
          authorAvatarUrl: null,
          caption: created.caption,
          occasionLabel: occasionLabel(analysis?.occasionId ?? "other"),
          postedAt: created.createdAt,
          analysisType: analysis?.analysisType ?? "completo",
          photoUrl: analysis?.photoDataUrl ?? null,
          overallScore: aiScore,
          scoreRevealed: true,
          likeCount: Array.from(created.reactions.values()).filter((r) => r === "like").length,
          commentCount: created.comments.length,
          myReaction: created.reactions.get(DEMO_USER.id) ?? null,
        },
        comments: created.comments.map((c) => ({ id: c.id, body: c.body, author: DEMO_USER.full_name })),
        isMine: true,
        isAuthed: true,
        aiScore,
        myBucket,
        tally,
      };
    }
    const seeded = DEMO_COMMUNITY_POSTS.find((p) => p.post_id === id);
    if (!seeded) return null;
    return {
      post: {
        id: seeded.post_id,
        authorId: seeded.author_id,
        authorName: seeded.author_name,
        authorAvatarUrl: seeded.author_avatar_url,
        caption: seeded.caption,
        occasionLabel: occasionLabel(seeded.occasion_id),
        postedAt: seeded.posted_at,
        analysisType: seeded.analysis_type,
        photoUrl: null,
        overallScore: seeded.overall_score,
        scoreRevealed: Boolean(myBucket),
        likeCount: seeded.like_count,
        commentCount: seeded.comment_count,
        myReaction: null,
      },
      comments: [],
      isMine: false,
      isAuthed: true,
      aiScore: seeded.overall_score,
      myBucket,
      tally,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lectura pública (post, foto, comentarios) con el cliente admin: las políticas
  // RLS de comunidad son "to authenticated", así que un visitante sin sesión no
  // podría leer nada. El community_feed_view es contenido público (posts ya
  // publicados), por eso es seguro exponerlo acá para abrir los links compartidos.
  const admin = createAdminClient();

  const { data: post } = await admin.from("community_feed_view").select("*").eq("post_id", id).single();
  if (!post) return null;

  const photoUrl = await signedPhotoUrl(admin, post.photo_path, "full");

  const { data: comments } = await admin
    .from("post_comments")
    .select("id, body, created_at, user_id, profiles(full_name)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  // Reacción y voto propios solo si hay sesión (con el cliente del usuario, RLS).
  const [{ data: myReaction }, { data: myVote }] = user
    ? await Promise.all([
        supabase.from("post_reactions").select("reaction").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("post_votes").select("bucket").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const aiScore = post.overall_score ?? 0;
  const isMine = user?.id === post.author_id;
  const myBucket = (myVote?.bucket ?? null) as VoteBucket | null;
  // El score se revela si es tu post, si ya lo votaste, o si el que mira NO tiene
  // sesión: a un visitante anónimo (link compartido) le mostramos el score como
  // anzuelo. El logueado sigue jugando (oculto hasta votar).
  const scoreRevealed = isMine || myBucket !== null || !user;

  return {
    post: {
      id: post.post_id,
      authorId: post.author_id,
      authorName: post.author_name,
      authorAvatarUrl: post.author_avatar_url,
      caption: post.caption,
      occasionLabel: occasionLabel(post.occasion_id as OccasionId),
      postedAt: post.posted_at,
      analysisType: post.analysis_type ?? "completo",
      photoUrl,
      overallScore: aiScore,
      scoreRevealed,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      myReaction: (myReaction?.reaction ?? null) as "like" | "dislike" | null,
    },
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      author: (c as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? "Usuario",
    })),
    isMine,
    isAuthed: Boolean(user),
    aiScore,
    myBucket,
    tally: {
      low: post.low_votes ?? 0,
      mid: post.mid_votes ?? 0,
      high: post.high_votes ?? 0,
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadPost(id);
  if (!data) notFound();

  return (
    <div className="screen-body pad">
      <ScreenHead title="Publicación" backHref="/community" />

      {/* En el detalle el score no va sobre la foto: lo revela el panel de abajo. */}
      <PostCard post={data.post} showScoreBadge={false} canInteract={data.isAuthed} />

      <PostVotePanel
        postId={id}
        aiScore={data.aiScore}
        isAuthed={data.isAuthed}
        isOwner={data.isMine}
        initialBucket={data.myBucket}
        initialTally={data.tally}
        initialRevealed={data.post.scoreRevealed}
      />

      <div className="mt-6 flex flex-col gap-4">
        <span className="text-[15px] font-extrabold">Comentarios</span>
        {data.comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="ph h-8 w-8 flex-none rounded-full" />
            <div>
              <span className="block text-[13px] font-extrabold">{c.author}</span>
              <span className="text-[13px] font-semibold text-ink">{c.body}</span>
            </div>
          </div>
        ))}
        {data.comments.length === 0 && (
          <p className="text-sm font-semibold text-muted">Sé el primero en comentar.</p>
        )}
      </div>

      {/* Comentar requiere sesión; al visitante anónimo lo invitamos a registrarse. */}
      {data.isAuthed ? (
        <CommentForm postId={id} />
      ) : (
        <Link
          href={`/welcome?next=${encodeURIComponent(`/community/post/${id}`)}`}
          className="mt-6 flex h-12 items-center justify-center rounded-full bg-coral text-sm font-extrabold text-white"
        >
          Registrate para comentar y votar
        </Link>
      )}

      {data.isMine && <DeletePostButton postId={id} />}
    </div>
  );
}
