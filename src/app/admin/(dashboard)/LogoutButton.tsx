"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/admin/api/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-muted transition hover:text-ink"
    >
      Salir
    </button>
  );
}
