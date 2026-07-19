import Link from "next/link";
import { notFound } from "next/navigation";
import { loadFollowList } from "@/lib/community/follows";
import { ScreenHead } from "@/components/navigation/TopBar";
import { FollowButton } from "@/components/community/FollowButton";

export default async function FollowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const type = tab === "siguiendo" ? "following" : "followers";
  const data = await loadFollowList(id, type);
  if (!data) notFound();

  return (
    <div className="screen-body pad">
      <ScreenHead title={data.ownerName} backHref={`/community/user/${id}`} />

      <div className="flex gap-5 border-b border-line">
        <Link
          href={`/community/user/${id}/follows?tab=seguidores`}
          className={`feed-tab ${type === "followers" ? "active" : ""}`}
        >
          Seguidores
        </Link>
        <Link
          href={`/community/user/${id}/follows?tab=siguiendo`}
          className={`feed-tab ${type === "following" ? "active" : ""}`}
        >
          Siguiendo
        </Link>
      </div>

      {data.users.length === 0 ? (
        <p className="py-16 text-center text-sm font-semibold text-muted">
          {type === "followers" ? "Todavía no tiene seguidores." : "Todavía no sigue a nadie."}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3.5">
          {data.users.map((u) => (
            <div key={u.userId} className="flex items-center gap-3">
              <Link href={`/community/user/${u.userId}`}>
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="ph h-11 w-11 rounded-full" />
                )}
              </Link>
              <Link href={`/community/user/${u.userId}`} className="flex-1 text-sm font-extrabold text-ink">
                {u.name}
              </Link>
              {!u.isMe && <FollowButton userId={u.userId} initialFollowing={u.amIFollowing} size="sm" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
