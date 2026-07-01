import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function BottomSheet({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-card p-6 pt-8", className)}
      {...props}
    />
  );
}
