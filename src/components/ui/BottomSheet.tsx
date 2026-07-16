import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function BottomSheet({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // `fixed` y no `absolute` para que quede pegado abajo de la pantalla
        // aunque la página scrollee. Pero fixed se posiciona contra el viewport,
        // y la app es una columna tipo teléfono centrada (ver (app)/layout.tsx):
        // sin acotar el ancho, en desktop el sheet se iría a todo lo ancho de la
        // ventana. left-1/2 + -translate-x-1/2 replica el mx-auto de la columna.
        "fixed bottom-0 left-1/2 right-auto w-full max-w-[430px] -translate-x-1/2",
        // Por encima de la tabbar (z-index 55 en globals.css) y del fab.
        "z-[60] rounded-t-[28px] bg-card p-6 pt-8",
        className,
      )}
      {...props}
    />
  );
}
