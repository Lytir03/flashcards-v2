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
