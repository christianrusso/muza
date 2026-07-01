import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

type Variant = "success" | "error";

const ICON: Record<Variant, string> = {
  success: "check_circle",
  error: "error",
};

export function Banner({
  variant,
  className,
  children,
}: {
  variant: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("banner", `banner--${variant}`, className)}>
      <MaterialIcon name={ICON[variant]} size={18} filled />
      <span>{children}</span>
    </div>
  );
}
