import { test } from "node:test";
import assert from "node:assert/strict";
import { isOAuthSignup, safeSourcePath } from "@/lib/signup";

// Los timestamps son los que devuelve Supabase en user: ISO con microsegundos.
function user(overrides: { provider?: string; created_at: string; last_sign_in_at?: string }) {
  return {
    app_metadata: overrides.provider ? { provider: overrides.provider } : {},
    created_at: overrides.created_at,
    last_sign_in_at: overrides.last_sign_in_at,
  };
}

test("isOAuthSignup: alta por Google, created_at y last_sign_in_at del mismo request", () => {
  assert.equal(
    isOAuthSignup(
      user({
        provider: "google",
        created_at: "2026-07-17T12:00:00.123456Z",
        last_sign_in_at: "2026-07-17T12:00:00.456789Z",
      }),
    ),
    true,
  );
});

test("isOAuthSignup: login posterior con Google no es alta", () => {
  assert.equal(
    isOAuthSignup(
      user({
        provider: "google",
        created_at: "2026-07-16T12:00:00Z",
        last_sign_in_at: "2026-07-17T12:00:00Z",
      }),
    ),
    false,
  );
});

test("isOAuthSignup: el alta por password no cuenta, la emite el formulario", () => {
  assert.equal(
    isOAuthSignup(
      user({
        provider: "email",
        created_at: "2026-07-17T12:00:00Z",
        last_sign_in_at: "2026-07-17T12:00:00Z",
      }),
    ),
    false,
  );
});

test("isOAuthSignup: sin last_sign_in_at cae al created_at y es alta", () => {
  assert.equal(isOAuthSignup(user({ provider: "google", created_at: "2026-07-17T12:00:00Z" })), true);
});

test("isOAuthSignup: sin provider no asumimos alta", () => {
  assert.equal(isOAuthSignup(user({ created_at: "2026-07-17T12:00:00Z" })), false);
});

test("isOAuthSignup: una fecha inválida no dispara un alta fantasma", () => {
  assert.equal(isOAuthSignup(user({ provider: "google", created_at: "no-es-fecha" })), false);
});

test("safeSourcePath: acepta rutas relativas", () => {
  assert.equal(safeSourcePath("/auth/callback"), "/auth/callback");
  assert.equal(safeSourcePath("/register"), "/register");
});

test("safeSourcePath: rechaza lo que saque el eventSourceUrl de nuestro origen", () => {
  assert.equal(safeSourcePath("//evil.com/x"), "/register");
  assert.equal(safeSourcePath("https://evil.com"), "/register");
  assert.equal(safeSourcePath(undefined), "/register");
  assert.equal(safeSourcePath(42), "/register");
});
