"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Fondos de las pantallas de auth (welcome / login). Se sortea uno en cada carga
// para que la puerta de entrada no se vea siempre igual. Para sumar otro, basta
// con dejar el archivo en public/ y agregarlo a esta lista: conviene WebP, que
// es la primera imagen que ve alguien que llega de un anuncio (login-bg2.jpg
// pesa el doble que la .webp por ser JPEG).
const BACKGROUNDS = ["/login-bg.webp", "/login-bg2.jpg"];

/**
 * Foto de fondo de auth, elegida al azar. El posicionamiento lo pone cada
 * pantalla por `className` (welcome la usa a pantalla completa; login, como una
 * franja arriba), y `children` es para lo que vaya encima dentro del recorte,
 * como el gradiente de login.
 */
export function AuthBackground({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLImageElement>(null);

  // El sorteo va acá y escribe el src directo en el DOM, no por estado:
  //  - elegirlo al renderizar en el server lo dejaría fijo, porque estas
  //    pantallas se prerenderizan a HTML en el build (una sola tirada para todos);
  //  - elegirlo al renderizar en el cliente rompería la hidratación, porque el
  //    HTML prerenderizado ya viene con otra imagen.
  // Hasta que corre el efecto se ve el ph-dark, igual que mientras carga la foto.
  useEffect(() => {
    const img = ref.current;
    if (img) img.src = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  }, []);

  return (
    <div className={cn("ph-dark overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} alt="" className="h-full w-full object-cover" />
      {children}
    </div>
  );
}
