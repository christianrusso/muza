import Link from "next/link";
import { relativeShortDate } from "@/lib/dates";
import { loadActivity, type ActivityItem } from "@/lib/community/activity";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { MarkActivitySeen } from "@/components/community/MarkActivitySeen";

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <Link href={`/community/post/${item.postId}`} className="flex items-center gap-3">
      <div className="relative flex-none">
        {item.actorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.actorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="ph h-10 w-10 rounded-full" />
        )}
        <span
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ background: item.kind === "like" ? "var(--coral)" : "var(--green)" }}
        >
          <MaterialIcon name={item.kind === "like" ? "favorite" : "chat_bubble"} size={12} filled />
        </span>
      </div>

      <div className="flex-1 leading-tight">
        <span className="text-[13.5px] font-extrabold">{item.actorName}</span>{" "}
        <span className="text-[13.5px] font-semibold text-muted">
          {item.kind === "like" ? "le dio like a tu look" : "comentó tu look"}
        </span>
        {item.kind === "comment" && item.commentBody && (
          <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-ink">“{item.commentBody}”</p>
        )}
        <span className="mt-0.5 block text-[11px] font-semibold text-faint">
          {relativeShortDate(item.createdAt)}
        </span>
      </div>

      {item.postPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.postPhotoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-12 w-12 flex-none rounded-lg object-cover"
        />
      )}
    </Link>
  );
}

export default async function ActivityPage() {
  const items = await loadActivity();

  return (
    <div className="screen-body pad">
      <MarkActivitySeen />
      <ScreenHead title="Actividad" backHref="/community" />

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-soft">
            <MaterialIcon name="favorite" size={26} className="text-coral" />
          </span>
          <p className="text-sm font-semibold text-muted">
            Todavía no hay actividad.
            <br />
            Cuando te den like o comenten tus looks, aparece acá.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
