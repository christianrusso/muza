// Client-safe demo-mode flag (no "server-only" import, unlike lib/demo.ts).
// NEXT_PUBLIC_ vars are inlined at build time, so this works in the browser too.
export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;
