import Link from "next/link";
import { notFound } from "next/navigation";
import { loadUserProfile } from "@/lib/community/profile";
import { ScreenHead } from "@/components/navigation/TopBar";
import { FollowButton } from "@/components/community/FollowButton";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-extrabold text-ink">{value}</span>
      <span className="text-[11px] font-semibold text-faint">{label}</span>
    </div>
  );
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await loadUserProfile(id);
  if (!profile) notFound();

  return (
    <div className="screen-body pad">
      <ScreenHead title={profile.name} backHref="/community" />

      <div className="mt-2 flex flex-col items-center gap-3">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-[72px] w-[72px] rounded-full object-cover" />
        ) : (
          <div className="ph h-[72px] w-[72px] rounded-full" />
        )}
        <span className="text-lg font-extrabold text-ink">{profile.name}</span>

        {/* Las listas de seguidores/seguidos son privadas: solo clickeables en tu
            propio perfil; en el de otros, los contadores no navegan. */}
        <div className="flex items-center gap-8">
          {profile.isMe ? (
            <>
              <Link href={`/community/user/${id}/follows?tab=seguidores`}>
                <Stat value={profile.followerCount} label="Seguidores" />
              </Link>
              <Link href={`/community/user/${id}/follows?tab=siguiendo`}>
                <Stat value={profile.followingCount} label="Siguiendo" />
              </Link>
            </>
          ) : (
            <>
              <Stat value={profile.followerCount} label="Seguidores" />
              <Stat value={profile.followingCount} label="Siguiendo" />
            </>
          )}
          <Stat value={profile.posts.length} label="Looks" />
        </div>

        {!profile.isMe && <FollowButton userId={profile.userId} initialFollowing={profile.amIFollowing} />}
      </div>

      {profile.posts.length === 0 ? (
        <p className="py-16 text-center text-sm font-semibold text-muted">Todavía no publicó looks.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {profile.posts.map((p) => (
            <Link
              key={p.postId}
              href={`/community/post/${p.postId}`}
              className="ph relative block overflow-hidden rounded-2xl"
              style={{ aspectRatio: "4/5" }}
            >
              {p.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <span
                className={`absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold text-white ring-2 ring-white/40 ${
                  p.scoreRevealed ? "bg-[var(--green)]" : "bg-black/55 backdrop-blur-sm"
                }`}
              >
                {p.scoreRevealed ? p.overallScore : <MaterialIcon name="lock" size={14} />}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
