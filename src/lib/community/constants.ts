// Tamaño de página del feed de comunidad. Se cargan de a 10 y el scroll infinito
// pide la siguiente tanda. Vive fuera de feed.ts (server-only) para poder
// importarse también desde el componente cliente de scroll infinito.
export const FEED_PAGE_SIZE = 10;

export type FeedTab = "popular" | "reciente";

export function normalizeTab(tab: string | undefined): FeedTab {
  return tab === "reciente" ? "reciente" : "popular";
}
