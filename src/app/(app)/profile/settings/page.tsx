import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { NotificationsToggle } from "@/components/settings/NotificationsToggle";
import { SessionActions } from "@/components/settings/SessionActions";

async function loadSettingsData() {
  if (isDemoMode()) {
    return {
      userId: DEMO_USER.id,
      notificationsEnabled: DEMO_USER.notifications_enabled,
      planTier: DEMO_USER.plan_tier,
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notifications_enabled, plan_tier")
    .eq("id", user!.id)
    .single();

  return {
    userId: user!.id,
    notificationsEnabled: profile?.notifications_enabled ?? true,
    planTier: profile?.plan_tier ?? "free",
  };
}

export default async function SettingsPage() {
  const { userId, notificationsEnabled, planTier } = await loadSettingsData();

  return (
    <div className="screen-body pad" style={{ gap: 18 }}>
      <ScreenHead title="Configuración" backHref="/profile" />

      {planTier !== "pro" && (
        <div
          className="relative overflow-hidden rounded-[20px] p-[18px]"
          style={{ background: "linear-gradient(135deg,#1F1B17,#141210)" }}
        >
          <div
            className="absolute -right-5 -top-[30px] h-[120px] w-[120px] rounded-full"
            style={{ background: "rgba(236,90,46,.35)", filter: "blur(10px)" }}
          />
          <div className="relative flex flex-col gap-1">
            <span className="font-serif italic flex items-center gap-1.5 text-2xl text-paper">
              <MaterialIcon name="workspace_premium" size={20} className="text-coral" />
              Muza Pro
            </span>
            <span className="mb-3.5 mt-0.5 text-[13px] font-semibold leading-tight text-white/75">
              Simulaciones ilimitadas y análisis avanzado
            </span>
            <button
              type="button"
              className="self-start rounded-2xl bg-coral px-5 py-2.5 text-[13px] font-extrabold text-white"
            >
              Mejorar plan
            </button>
          </div>
        </div>
      )}

      <div>
        <span className="section-label mb-2 block px-1">Cuenta</span>
        <div className="list-card">
          <Link href="/profile/edit-name" className="row">
            <MaterialIcon name="badge" />
            <span className="txt">Editar nombre</span>
            <MaterialIcon name="chevron_right" className="chev" />
          </Link>
        </div>
      </div>

      <div>
        <span className="section-label mb-2 block px-1">Preferencias</span>
        <div className="list-card">
          <div className="row">
            <MaterialIcon name="translate" />
            <span className="txt">Idioma</span>
            <span className="meta">Español</span>
          </div>
          <div className="row">
            <MaterialIcon name="notifications" />
            <span className="txt">Notificaciones</span>
            <NotificationsToggle initialOn={notificationsEnabled} userId={userId} />
          </div>
        </div>
      </div>

      <div>
        <span className="section-label mb-2 block px-1">Sesión</span>
        <SessionActions />
      </div>
    </div>
  );
}
