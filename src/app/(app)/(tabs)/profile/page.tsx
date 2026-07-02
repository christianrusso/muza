import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

async function loadProfileData() {
  if (isDemoMode()) {
    const store = getDemoStore();
    const created = Array.from(store.analyses.values()).filter(
      (a) => a.validityStatus === "valid" && a.overallScore !== null,
    );
    const scores = [...created.map((a) => a.overallScore!), ...DEMO_ANALYSES.map((a) => a.overallScore)];
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const posts = Array.from(store.posts.values()).map((p) => ({
      id: p.id,
      photoUrl: store.analyses.get(p.analysisId)?.photoDataUrl ?? null,
    }));
    return {
      firstName: DEMO_USER.full_name.split(" ")[0],
      avatarUrl: null as string | null,
      planTier: DEMO_USER.plan_tier,
      average,
      analysesCount: scores.length,
      posts,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, plan_tier")
    .eq("id", user!.id)
    .single();

  const { data: analyses } = await supabase
    .from("analyses")
    .select("overall_score")
    .eq("user_id", user!.id)
    .eq("validity_status", "valid");
  const scores = (analyses ?? []).map((a) => a.overall_score).filter((s): s is number => s !== null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const { data: posts } = await supabase
    .from("community_posts")
    .select("id, created_at, analyses(photo_path)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const postsWithPhotoUrls = await Promise.all(
    (posts ?? []).map(async (p) => {
      const photoPath = (p as unknown as { analyses: { photo_path: string } | null }).analyses?.photo_path;
      if (!photoPath) return { id: p.id, photoUrl: null };
      const { data: signed } = await supabase.storage.from("outfit-photos").createSignedUrl(photoPath, 3600);
      return { id: p.id, photoUrl: signed?.signedUrl ?? null };
    }),
  );

  return {
    firstName: profile?.full_name?.split(" ")[0] ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    planTier: profile?.plan_tier ?? "free",
    average,
    analysesCount: scores.length,
    posts: postsWithPhotoUrls,
  };
}

export default async function ProfilePage() {
  const { firstName, avatarUrl, planTier, average, analysesCount, posts: postsWithPhotoUrls } = await loadProfileData();

  return (
    <div className="flex min-h-screen flex-col gap-4 px-[22px] pt-[60px]">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div
            className="ph h-[104px] w-[104px] rounded-full border-2 border-white"
            style={{
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
              ...(avatarUrl
                ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}),
            }}
          />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-coral text-white">
            <MaterialIcon name="edit" size={16} />
          </span>
        </div>
        <span className="font-serif italic mt-3 text-[26px]">{firstName}</span>
        <span className="chip mt-2">
          <MaterialIcon name="star" size={15} />
          {planTier === "pro" ? "Muza Pro" : "Plan Gratis"}
        </span>
      </div>

      <div className="flex gap-3">
        <div className="card flex-1 p-3.5 text-center">
          <span className="block text-2xl font-extrabold">{average}</span>
          <span className="section-label">Promedio</span>
        </div>
        <div className="card flex-1 p-3.5 text-center">
          <span className="block text-2xl font-extrabold">{analysesCount}</span>
          <span className="section-label">Análisis</span>
        </div>
        <div className="card flex-1 p-3.5 text-center">
          <span className="block text-2xl font-extrabold">{postsWithPhotoUrls.length}</span>
          <span className="section-label">Publicaciones</span>
        </div>
      </div>

      <span className="section-label">Tus publicaciones</span>
      <div className="grid grid-cols-3 gap-2">
        {postsWithPhotoUrls.map((p) => (
          <div
            key={p.id}
            className="ph aspect-square rounded-xl"
            style={p.photoUrl ? { backgroundImage: `url(${p.photoUrl})`, backgroundSize: "cover" } : {}}
          />
        ))}
        {postsWithPhotoUrls.length === 0 && (
          <p className="col-span-3 py-4 text-center text-sm font-semibold text-muted">
            Todavía no publicaste ningún análisis.
          </p>
        )}
      </div>

      <div className="list-card mt-2">
        <Link href="/profile/edit-name" className="row">
          <MaterialIcon name="person" />
          <span className="txt">Editar nombre</span>
          <MaterialIcon name="chevron_right" className="chev" />
        </Link>
        <Link href="/profile/settings" className="row">
          <MaterialIcon name="settings" />
          <span className="txt">Configuración</span>
          <MaterialIcon name="chevron_right" className="chev" />
        </Link>
      </div>
    </div>
  );
}
