import { z } from "zod";

/**
 * What the model must return. Validated with Zod before anything is written:
 * a malformed batch is rejected whole rather than saved half-broken, because
 * a partially-inserted set of cards is worse to clean up than none.
 */
export const generatedCard = z.object({
  question: z.string().trim().min(5).max(2000),
  answer: z.string().trim().min(1).max(4000),
  /** Short subject tag, e.g. "Lagrangian duality". Keeps decks browsable. */
  topic: z.string().trim().min(2).max(60),
  /** Page the card came from, so it can be checked against the slide. */
  page: z.number().int().min(1).nullable(),
});

export const generatedCardSet = z.object({
  cards: z.array(generatedCard).min(1).max(15),
});

export type GeneratedCard = z.infer<typeof generatedCard>;

/** JSON Schema handed to the model. Mirrors the Zod schema above. */
export const CARD_JSON_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          topic: { type: "string" },
          page: { type: ["integer", "null"] },
        },
        required: ["question", "answer", "topic", "page"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
} as const;

/**
 * Distractors for one challenge's multiple-choice questions, generated in a
 * single batched call (one Claude call per challenge, not one per question).
 * `index` round-trips the position of the question it belongs to, since the
 * model may not return items in the order they were asked.
 */
export const distractorItem = z.object({
  index: z.number().int().min(0),
  distractors: z.array(z.string().trim().min(1).max(500)).length(3),
});

export const distractorSet = z.object({
  items: z.array(distractorItem).min(1).max(20),
});

export type DistractorItem = z.infer<typeof distractorItem>;

export const DISTRACTOR_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          distractors: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["index", "distractors"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;
