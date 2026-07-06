import { HomeSkeleton } from "@/components/loading/Skeletons";

// Fallback instantáneo al navegar a Home: en vez de dejar la pantalla anterior
// congelada mientras el server trae datos, se pinta el skeleton al toque.
export default function Loading() {
  return <HomeSkeleton />;
}
