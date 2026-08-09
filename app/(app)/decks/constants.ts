/**
 * Kept out of actions.ts because a "use server" file may only export async
 * functions — exporting a plain array from it fails the build.
 */
export const DECK_COLORS = [
  "slate",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
] as const;

export type DeckColor = (typeof DECK_COLORS)[number];
