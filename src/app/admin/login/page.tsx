"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/admin/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }
      window.location.href = "/admin";
    } catch {
      setError("Error de red. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-coral">LookLab</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Panel</h1>
        <p className="mt-1 text-sm text-muted">Acceso restringido.</p>

        <label className="mt-6 block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink outline-none focus:border-coral"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink outline-none focus:border-coral"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-coral px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
