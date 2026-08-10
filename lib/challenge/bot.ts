/**
 * Practice-bot behaviour. Pure: the caller supplies randomness, so a route
 * handler can seed it deterministically in tests and use Math.random in
 * production. Correctness and timing are decided here, server-side, never by
 * the client — a human playing a bot must not be able to dictate whether
 * "the bot" gets a question right.
 */

export const BOT_SKILL_LEVELS = ["novice", "casual", "sharp", "ace"] as const;
export type BotSkillLevel = (typeof BOT_SKILL_LEVELS)[number];

type SkillProfile = { accuracy: number; speedMin: number; speedMax: number };

/** speedMin/speedMax are fractions of the question's own deadline. */
const SKILL_PROFILES: Record<BotSkillLevel, SkillProfile> = {
  novice: { accuracy: 0.4, speedMin: 0.6, speedMax: 1.0 },
  casual: { accuracy: 0.6, speedMin: 0.4, speedMax: 0.8 },
  sharp: { accuracy: 0.8, speedMin: 0.2, speedMax: 0.55 },
  ace: { accuracy: 0.95, speedMin: 0.08, speedMax: 0.3 },
};

export type BotAnswer = { isCorrect: boolean; responseMs: number };

export function botAnswer(
  level: BotSkillLevel,
  secondsPerQuestion: number,
  rand: () => number = Math.random,
): BotAnswer {
  const profile = SKILL_PROFILES[level];
  const isCorrect = rand() < profile.accuracy;
  const fraction = profile.speedMin + rand() * (profile.speedMax - profile.speedMin);

  return {
    isCorrect,
    responseMs: Math.round(fraction * secondsPerQuestion * 1000),
  };
}

/** Picks a wrong choice index, uniformly among the three that aren't correct. */
export function botWrongIndex(correctIndex: number, rand: () => number = Math.random): number {
  const wrongIndices = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  return wrongIndices[Math.floor(rand() * wrongIndices.length)];
}
