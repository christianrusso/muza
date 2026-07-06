import "server-only";

// Instrumentación de tiempos de servidor, apagada por defecto. Se prende con la
// env var PERF_LOG (en Vercel: Settings → Environment Variables). Los logs salen
// en los Runtime Logs del deploy, con el prefijo [perf] para filtrar fácil.
// Objetivo: medir dónde se va el tiempo por ruta (auth, queries, fotos) antes de
// optimizar a ciegas. Cero costo cuando el flag está apagado.
const ENABLED = !!process.env.PERF_LOG;

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] ${label}: ${Math.round(performance.now() - start)}ms`);
  }
}
