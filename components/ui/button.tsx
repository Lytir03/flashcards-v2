import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "gold" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand border-b-brand-dark text-white hover:bg-brand-dark",
  secondary: "bg-accent border-b-accent-dark text-white hover:bg-accent-dark",
  gold: "bg-gold border-b-gold-dark text-white hover:bg-gold-dark",
  danger: "bg-danger border-b-danger-dark text-white hover:bg-danger-dark",
  ghost:
    "bg-transparent border border-black/15 text-current hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5",
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
  const sizeClasses = size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";

  return (
    <button
      {...props}
      className={[
        "rounded-xl font-bold transition-transform disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses,
        VARIANT_CLASSES[variant],
        PRESSABLE[variant] ? "border-b-4 active:translate-y-0.5 active:border-b-2" : "",
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
