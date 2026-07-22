import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { AdminNav } from "./AdminNav";
import { LogoutButton } from "./LogoutButton";

// Defensa en profundidad: el proxy ya gatea /admin, pero validamos también acá
// por si el matcher del proxy cambiara o algo lo saltara.
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authed = await verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!authed) redirect("/admin/login");

  return (
    <div className="min-h-full flex-1 bg-paper">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-coral">
              LookLab
            </span>
            <span className="font-serif text-xl text-ink">Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <AdminNav />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-8">{children}</main>
    </div>
  );
}
