import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "gold" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand border-b-brand-dark text-white hover:brightness-[1.04]",
  secondary: "bg-accent border-b-accent-dark text-white hover:brightness-[1.04]",
  gold: "bg-gold border-b-gold-dark text-white hover:brightness-[1.04]",
  danger: "bg-danger border-b-danger-dark text-white hover:brightness-[1.04]",
  ghost:
    "bg-white border-2 border-b-4 border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-white/5 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-white/10",
};

/** Ghost stays flat/outlined on purpose — the 3D press is for the chunky, filled variants. */
const PRESSABLE: Record<ButtonVariant, boolean> = {
  primary: true,
  secondary: true,
  gold: true,
  danger: true,
  ghost: false,
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  fullWidth?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm";

  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold uppercase tracking-wide transition-[transform,filter,background-color] disabled:pointer-events-none disabled:opacity-50",
        sizeClasses,
        VARIANT_CLASSES[variant],
        PRESSABLE[variant]
          ? "border-b-4 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2"
          : "hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2",
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
