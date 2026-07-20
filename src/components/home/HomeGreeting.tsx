import { greetingDate } from "@/lib/dates";

export function HomeGreeting({ firstName, avatarUrl }: { firstName: string; avatarUrl: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="section-label">{greetingDate()}</span>
        <span className="text-[26px] font-extrabold text-ink">
          Hola, <span className="font-serif italic text-[32px] font-normal">{firstName}</span>
        </span>
      </div>
      <div
        className="ph h-[46px] w-[46px] rounded-full border-2 border-white"
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          ...(avatarUrl
            ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : {}),
        }}
      />
    </div>
  );
}
