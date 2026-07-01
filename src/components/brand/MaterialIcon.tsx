import { cn } from "@/lib/utils";

export function MaterialIcon({
  name,
  filled = false,
  size = 24,
  className,
}: {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("msym", filled && "filled", className)}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
