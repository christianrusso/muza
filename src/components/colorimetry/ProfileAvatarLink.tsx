import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Avatar que lleva al Perfil (misma puerta que el encabezado de Home). La
// colorimetría vive fuera de las tabs, así que sin esto no había forma de saltar
// al perfil desde estas pantallas. `glass` = variante para fondos oscuros (el
// encabezado del resultado va sobre un degradé).
export function ProfileAvatarLink({
  avatarUrl,
  size = 38,
  glass = false,
}: {
  avatarUrl: string | null;
  size?: number;
  glass?: boolean;
}) {
  return (
    <Link
      href="/profile"
      aria-label="Ver perfil"
      className={`flex flex-none items-center justify-center overflow-hidden rounded-full ${
        glass ? "bg-white/25 backdrop-blur-sm" : "border-2 border-white"
      }`}
      style={{
        height: size,
        width: size,
        ...(glass ? {} : { boxShadow: "0 2px 8px rgba(0,0,0,.08)" }),
        ...(avatarUrl
          ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}),
      }}
    >
      {!avatarUrl && (
        <MaterialIcon
          name="person"
          size={Math.round(size * 0.55)}
          className={glass ? "text-white" : "text-muted"}
        />
      )}
    </Link>
  );
}
