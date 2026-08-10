import type { DeckColor } from "@/app/(app)/decks/constants";

/**
 * Tailwind's stock palette already has a family named after each DeckColor,
 * so this is a lookup, not new tokens. Classes are spelled out in full
 * (never built with a template string) so Tailwind's source scan can see
 * them — a `bg-${color}-500` interpolation would silently produce no CSS.
 */
export const DECK_COLOR_CLASSES: Record<
  DeckColor,
  { solid: string; light: string; text: string }
> = {
  slate: {
    solid: "bg-slate-500",
    light: "bg-slate-100 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-300",
  },
  rose: {
    solid: "bg-rose-500",
    light: "bg-rose-100 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-300",
  },
  amber: {
    solid: "bg-amber-500",
    light: "bg-amber-100 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-300",
  },
  emerald: {
    solid: "bg-emerald-500",
    light: "bg-emerald-100 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  sky: {
    solid: "bg-sky-500",
    light: "bg-sky-100 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-300",
  },
  violet: {
    solid: "bg-violet-500",
    light: "bg-violet-100 dark:bg-violet-500/20",
    text: "text-violet-600 dark:text-violet-300",
  },
};
