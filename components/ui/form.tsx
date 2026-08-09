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
    <label htmlFor={htmlFor} className="block text-sm font-medium opacity-80">
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm " +
        "outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40 " +
        (props.className ?? "")
      }
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={
        "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm " +
        "outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40 " +
        (props.className ?? "")
      }
    />
  );
}

/** Disables itself while the enclosing form action is in flight. */
export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "danger"
      ? "border border-red-500/40 text-red-600 hover:bg-red-500/10"
      : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white";

  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {pending ? "…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-500">
      {message}
    </p>
  );
}
