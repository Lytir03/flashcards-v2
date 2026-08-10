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
    <label htmlFor={htmlFor} className="block text-sm font-bold opacity-80">
      {children}
    </label>
  );
}

const FIELD_CLASSES =
  "mt-1 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm " +
  "outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 " +
  "dark:border-white/15 dark:focus:border-brand";

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
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-xl border-b-4 px-4 py-2 text-sm font-bold transition-transform disabled:opacity-50 disabled:pointer-events-none active:translate-y-0.5 active:border-b-2";
  const styles =
    variant === "danger"
      ? "bg-danger border-b-danger-dark text-white hover:bg-danger-dark"
      : "bg-brand border-b-brand-dark text-white hover:bg-brand-dark";

  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
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
