import Link from "next/link";
import { relativeShortDate } from "@/lib/dates";
import { loadActivity, type ActivityItem } from "@/lib/community/activity";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { MarkActivitySeen } from "@/components/community/MarkActivitySeen";

const BADGE = {
  like: { icon: "favorite", bg: "var(--coral)" },
  comment: { icon: "chat_bubble", bg: "var(--green)" },
  follow: { icon: "person_add", bg: "var(--ink)" },
  votes: { icon: "how_to_vote", bg: "var(--coral)" },
} as const;

const ACTION_TEXT = {
  like: "le dio like a tu look",
  comment: "comentó tu look",
  follow: "empezó a seguirte",
  votes: "",
} as const;

function ActivityRow({ item }: { item: ActivityItem }) {
  // Los follows llevan al perfil del que te siguió; el resto al post.
  const href = item.kind === "follow" ? `/community/user/${item.actorId}` : `/community/post/${item.postId}`;
  // Los votos son un resumen: no hay actor, así que en vez del avatar va el ícono
  // sobre un círculo neutro y el texto habla del post, no de una persona.
  const isVotes = item.kind === "votes";
  const count = item.voteCount ?? 0;

  return (
    <Link
      href={href}
      // Lo no visto se despega del resto con fondo suave y un punto coral: el
      // badge de la tab avisa QUE hay algo, esto avisa QUÉ.
      className={`flex items-center gap-3 ${item.isNew ? "-mx-2 rounded-xl bg-coral-soft px-2 py-2" : ""}`}
    >
      <div className="relative flex-none">
        {isVotes ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-soft" aria-hidden>
            <MaterialIcon name="how_to_vote" size={20} className="text-coral" />
          </span>
        ) : item.actorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.actorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="ph h-10 w-10 rounded-full" />
        )}
        {!isVotes && (
          <span
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ background: BADGE[item.kind].bg }}
          >
            <MaterialIcon name={BADGE[item.kind].icon} size={12} filled />
          </span>
        )}
      </div>

      <div className="flex-1 leading-tight">
        {isVotes ? (
          <>
            <span className="text-[13.5px] font-extrabold">
              {count === 1 ? "1 persona votó" : `${count} personas votaron`}
            </span>{" "}
            <span className="text-[13.5px] font-semibold text-muted">tu look</span>
            <p className="mt-0.5 text-[13px] font-semibold text-muted">Mirá cómo viene el consenso</p>
          </>
        ) : (
          <>
            <span className="text-[13.5px] font-extrabold">{item.actorName}</span>{" "}
            <span className="text-[13.5px] font-semibold text-muted">{ACTION_TEXT[item.kind]}</span>
            {item.kind === "comment" && item.commentBody && (
              <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-ink">“{item.commentBody}”</p>
            )}
          </>
        )}
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-faint">
          {relativeShortDate(item.createdAt)}
          {item.isNew && <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-label="Nuevo" />}
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
            Cuando voten, te den like o comenten tus looks, aparece acá.
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
