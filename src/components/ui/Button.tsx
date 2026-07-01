import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "light" | "icon";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variantClass =
    variant === "primary"
      ? "btn btn-primary"
      : variant === "outline"
        ? "btn btn-outline"
        : variant === "ghost"
          ? "btn btn-ghost"
          : variant === "light"
            ? "btn btn-light"
            : "btn-icon";

  return (
    <button className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}
