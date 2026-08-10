/**
 * Challenge scoring. Pure: no database, no clock — a route handler computes
 * this itself from a submitted answer rather than trusting a client-sent
 * score, per the trust model in docs/01-architecture.md.
 */

export type ScoreInput = {
  isCorrect: boolean;
  /** Time from question shown to answer submitted, or the deadline on timeout. */
  responseMs: number;
  secondsPerQuestion: number;
};

const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 50;

/**
 * Wrong answers and timeouts score 0 — a timeout already arrives as
 * isCorrect: false (selected_index null never equals correct_index), so no
 * separate branch is needed here for "timed out" specifically.
 */
export function scoreAnswer({
  isCorrect,
  responseMs,
  secondsPerQuestion,
}: ScoreInput): number {
  if (!isCorrect) return 0;

  const deadlineMs = secondsPerQuestion * 1000;
  const clamped = Math.min(deadlineMs, Math.max(0, responseMs));
  const bonus = Math.round(MAX_SPEED_BONUS * (1 - clamped / deadlineMs));

  return BASE_POINTS + bonus;
}

export type Outcome = "win" | "loss" | "draw";

export function matchOutcome(
  scoreA: number,
  scoreB: number,
): { a: Outcome; b: Outcome } {
  if (scoreA === scoreB) return { a: "draw", b: "draw" };
  return scoreA > scoreB ? { a: "win", b: "loss" } : { a: "loss", b: "win" };
}
