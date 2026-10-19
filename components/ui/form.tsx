"use client";

import { useFormStatus } from "react-dom";

export function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-extrabold text-slate-600 dark:text-slate-300">
      {children}
    </label>
  );
}

const FIELD_CLASSES =
  "mt-1.5 w-full rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3 text-sm font-semibold " +
  "outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 " +
  "dark:border-[#363c45] dark:bg-[#23272f] dark:focus:border-accent";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={FIELD_CLASSES + " " + (props.className ?? "")}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={FIELD_CLASSES + " " + (props.className ?? "")}
    />
  );
}

/**
 * Disables itself while the enclosing form action is in flight. Mirrors
 * Button's variant classes (components/ui/button.tsx) rather than importing
 * it directly — Button takes onClick handlers, this needs useFormStatus
 * wired to a <button type="submit"> instead, so it stays its own component.
 */
export function SubmitButton({
  children,
  variant = "primary",
  fullWidth = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger";
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-2xl border-b-4 px-5 py-3 text-sm font-extrabold uppercase tracking-wide transition-transform disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2";
  const styles =
    variant === "danger"
      ? "bg-danger border-b-danger-dark text-white hover:bg-danger-dark"
      : "bg-brand border-b-brand-dark text-white hover:bg-brand-dark";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} ${styles} ${fullWidth ? "w-full" : ""}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-semibold text-danger">
      {message}
    </p>
  );
}
