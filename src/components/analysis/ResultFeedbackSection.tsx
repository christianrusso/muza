import { MaterialIcon } from "@/components/brand/MaterialIcon";

interface FeedbackItem {
  text: string;
}

/**
 * Una sección de feedback del resultado (fortalezas / aspectos a mejorar /
 * recomendaciones). Las tres compartían casi el mismo markup copiado y pegado
 * tres veces — esto lo unifica en un solo lugar parametrizado.
 *
 * `variant="pt"` es la lista con ícono por ítem (fortalezas, aspectos).
 * `variant="rec"` son las cards de recomendación, sin ícono por ítem.
 *
 * Los colores se pasan como clases de Tailwind ya armadas (no como hex/var
 * sueltos) para que el build pueda detectarlas estáticamente, igual que ya
 * hacía el código original.
 */
export function ResultFeedbackSection({
  title,
  headerIcon,
  itemIcon,
  iconClassName,
  items,
  variant = "pt",
  className = "mt-[22px]",
}: {
  title: string;
  headerIcon?: string;
  itemIcon?: string;
  iconClassName?: string;
  items: FeedbackItem[];
  variant?: "pt" | "rec";
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className={variant === "pt" ? "mb-3 flex items-center gap-2" : "mb-3 flex items-baseline justify-between"}>
        {headerIcon && <MaterialIcon name={headerIcon} size={20} className={iconClassName} />}
        <span className="text-[15px] font-extrabold">{title}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {variant === "pt"
          ? items.map((item) => (
              <div key={item.text} className="pt">
                {itemIcon && <MaterialIcon name={itemIcon} className={iconClassName} />}
                <span>{item.text}</span>
              </div>
            ))
          : items.map((item) => (
              <div key={item.text} className="rec">
                <span className="rt block">{item.text}</span>
              </div>
            ))}
      </div>
    </div>
  );
}
