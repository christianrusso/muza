import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type Validity = "neutral" | "ok" | "err";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Input({
  validity = "neutral",
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { validity?: Validity }) {
  return (
    <input
      className={cn(
        "input",
        validity === "ok" && "ok",
        validity === "err" && "err",
        className,
      )}
      {...props}
    />
  );
}
