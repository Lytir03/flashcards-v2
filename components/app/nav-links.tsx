"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, Settings, Swords } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Review", icon: House },
  { href: "/decks", label: "Decks", icon: BookOpen },
  { href: "/challenges", label: "Challenges", icon: Swords },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <div className={compact ? "grid grid-cols-4" : "space-y-2"}>
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex items-center font-extrabold uppercase tracking-wide transition",
              compact
                ? "flex-col gap-1 px-1 py-2 text-[10px]"
                : "gap-3 rounded-2xl border-2 px-4 py-3 text-sm",
              active
                ? "border-accent/35 bg-accent/10 text-accent-dark dark:text-accent"
                : compact
                  ? "text-slate-400 hover:text-accent"
                  : "border-transparent text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
            ].join(" ")}
          >
            <Icon
              className={compact ? "size-5" : "size-6"}
              strokeWidth={active ? 3 : 2.4}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
