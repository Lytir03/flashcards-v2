import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-5 dark:border-[#363c45] dark:bg-[#23272f]",
        interactive
          ? "transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:border-accent/45 hover:shadow-[0_10px_30px_rgb(36_48_71_/_0.08)] active:translate-y-0"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
