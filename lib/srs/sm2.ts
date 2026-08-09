/**
 * SM-2 scheduling. A pure function: no database, no clock, no I/O — the date
 * comes in as an argument. That is what makes it testable, and this is the one
 * piece of the app where a silent bug would be invisible for weeks and then
 * ruin months of study.
 */

export const RATINGS = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof RATINGS)[number];

export type CardState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  state: "new" | "learning" | "review" | "suspended";
};

export type ScheduledState = CardState & { dueOn: string };

/** SM-2 quality values for the four buttons. */
const QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

const MIN_EASE = 1.3;
/** Anki's cap. Without it, a long streak of "easy" pushes intervals to absurdity. */
const MAX_INTERVAL_DAYS = 365 * 10;

export const INITIAL_STATE: CardState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
  state: "new",
};

function addDays(from: Date, days: number): string {
  const date = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function schedule(
  current: CardState,
  rating: Rating,
  today: Date = new Date(),
): ScheduledState {
  const quality = QUALITY[rating];

  // Ease moves on every review, including lapses. Textbook SM-2 formula.
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const easeFactor = Math.max(
    MIN_EASE,
    Math.round((current.easeFactor + easeDelta) * 100) / 100,
  );

  if (rating === "again") {
    // Interval 0 means "show it again in this session". The card is not
    // scheduled for a future day at all: forgetting it now and being asked
    // tomorrow teaches nothing.
    return {
      easeFactor,
      intervalDays: 0,
      repetitions: 0,
      lapses: current.lapses + 1,
      state: "learning",
      dueOn: addDays(today, 0),
    };
  }

  const repetitions = current.repetitions + 1;

  let intervalDays: number;
  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(current.intervalDays * easeFactor);
  }

  // Deviations from textbook SM-2, taken from Anki: without them "hard" and
  // "good" produce nearly identical intervals, and users notice that pressing
  // "hard" changed nothing.
  if (rating === "hard") intervalDays = Math.max(1, Math.round(intervalDays * 0.8));
  if (rating === "easy") intervalDays = Math.round(intervalDays * 1.3);

  intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.max(1, intervalDays));

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses: current.lapses,
    state: "review",
    dueOn: addDays(today, intervalDays),
  };
}
