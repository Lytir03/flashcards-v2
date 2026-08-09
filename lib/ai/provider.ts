import "server-only";
import { serverEnv } from "@/lib/env";
import {
  GENERATION_SYSTEM,
  TRANSCRIPTION_SYSTEM,
  generationUserPrompt,
  transcriptionUserPrompt,
} from "./prompts";
import {
  CARD_JSON_SCHEMA,
  generatedCardSet,
  type GeneratedCard,
} from "./schemas";

export type TranscribeResult =
  | { ok: true; text: string; model: string }
  | { ok: false; error: string };

export type GenerateResult =
  | { ok: true; cards: GeneratedCard[]; model: string }
  | { ok: false; error: string };

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  transcribePage(
    png: Uint8Array,
    page: number,
    totalPages: number,
  ): Promise<TranscribeResult>;
  generateCards(text: string, deckName: string): Promise<GenerateResult>;
}

/**
 * Models wrap JSON in prose or code fences even when told not to. Pull out the
 * outermost object rather than failing the whole batch over a stray "Here you
 * go:".
 */
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in the response.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Qwen3 and friends emit a <think> block before the answer. Harmless in chat,
 * fatal when the output is meant to be a verbatim transcription.
 */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * "Write it in LaTeX" gets read by smaller models as "write me a LaTeX file",
 * and the transcription arrives wrapped in \documentclass ... \begin{document}.
 * The prompt forbids it; this removes it when the model does it anyway.
 *
 * Note what this does NOT do: it does not fix the semicolons that these models
 * put where commas belong. Silently rewriting the model's output based on my
 * own guess about what it meant is the exact behaviour this whole pipeline
 * exists to prevent. Those get flagged for a human instead.
 */
function stripDocumentWrapper(text: string): string {
  let out = text;
  const beginDoc = out.indexOf("\\begin{document}");
  if (beginDoc !== -1) out = out.slice(beginDoc + "\\begin{document}".length);
  out = out.replace(/\\end\{document\}[\s\S]*$/, "");
  out = out.replace(/^\s*\\(?:documentclass|usepackage)\{[^}]*\}.*$/gm, "");
  return out.trim();
}

function cleanTranscription(text: string): string {
  return stripDocumentWrapper(stripThinking(text));
}

// --- Ollama (local, free) ----------------------------------------------------

function ollamaProvider(): AiProvider {
  const { ollamaBaseUrl, ollamaModel, ollamaVisionModel } = serverEnv();

  return {
    name: "ollama",
    model: ollamaVisionModel,
    async transcribePage(png, page, totalPages) {
      try {
        const response = await fetch(`${ollamaBaseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaVisionModel,
            stream: false,
            temperature: 0,
            messages: [
              { role: "system", content: TRANSCRIPTION_SYSTEM },
              {
                role: "user",
                content: [
                  { type: "text", text: transcriptionUserPrompt(page, totalPages) },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/png;base64,${toBase64(png)}` },
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          return {
            ok: false,
            error:
              response.status === 404
                ? `Model "${ollamaVisionModel}" is not installed. Run: ollama pull ${ollamaVisionModel}`
                : `Ollama returned ${response.status}: ${body.slice(0, 300)}`,
          };
        }

        const data = await response.json();
        const text = cleanTranscription(
          data?.choices?.[0]?.message?.content ?? "",
        );
        if (!text) return { ok: false, error: "The model returned nothing." };

        return { ok: true, text, model: ollamaVisionModel };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error && error.message.includes("fetch")
              ? "Could not reach Ollama. Is `ollama serve` running?"
              : String(error),
        };
      }
    },

    async generateCards(text, deckName) {
      // One retry, with the validation error fed back. Small models miss a
      // required field roughly one time in ten, and being told exactly what
      // was wrong fixes it far more often than sampling again blindly.
      let lastError = "";

      for (let attempt = 0; attempt < 2; attempt++) {
        const messages = [
          {
            role: "system",
            // Qwen3 is a thinking model: left alone it writes a long <think>
            // block before the answer, which we then discard — so we were
            // paying the wait for reasoning we throw away. On a task with a
            // fixed output schema it buys little. `/no_think` is Qwen3's own
            // switch for this and is ignored harmlessly by other models.
            content: `${GENERATION_SYSTEM}\n\n/no_think`,
          },
          {
            role: "user",
            content:
              generationUserPrompt(deckName, text) +
              `\n\nReturn JSON matching this schema:\n${JSON.stringify(CARD_JSON_SCHEMA)}` +
              (lastError
                ? `\n\nYour previous reply was rejected: ${lastError}. Fix it and return only JSON.`
                : ""),
          },
        ];

        try {
          const response = await fetch(`${ollamaBaseUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: ollamaModel,
              stream: false,
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages,
            }),
          });

          if (!response.ok) {
            const body = await response.text();
            return {
              ok: false,
              error:
                response.status === 404
                  ? `Model "${ollamaModel}" is not installed. Run: ollama pull ${ollamaModel}`
                  : `Ollama returned ${response.status}: ${body.slice(0, 300)}`,
            };
          }

          const data = await response.json();
          const raw = stripThinking(data?.choices?.[0]?.message?.content ?? "");
          const parsed = generatedCardSet.safeParse(extractJson(raw));

          if (parsed.success) {
            return { ok: true, cards: parsed.data.cards, model: ollamaModel };
          }
          lastError = parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
        } catch (error) {
          lastError = String(error);
        }
      }

      return {
        ok: false,
        error: `The model did not return usable cards. ${lastError}`,
      };
    },
  };
}

// --- Anthropic ---------------------------------------------------------------

function anthropicProvider(): AiProvider {
  const { anthropicApiKey, anthropicModel } = serverEnv();

  return {
    name: "anthropic",
    model: anthropicModel,
    async transcribePage(png, page, totalPages) {
      if (!anthropicApiKey) {
        return { ok: false, error: "ANTHROPIC_API_KEY is not set." };
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 4096,
          system: TRANSCRIPTION_SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: toBase64(png),
                  },
                },
                { type: "text", text: transcriptionUserPrompt(page, totalPages) },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { ok: false, error: `Anthropic returned ${response.status}: ${body.slice(0, 300)}` };
      }

      const data = await response.json();
      const text = cleanTranscription(
        (data?.content ?? [])
          .filter((block: { type: string }) => block.type === "text")
          .map((block: { text: string }) => block.text)
          .join("\n"),
      );

      if (!text) return { ok: false, error: "The model returned nothing." };
      return { ok: true, text, model: anthropicModel };
    },

    async generateCards(text, deckName) {
      if (!anthropicApiKey) {
        return { ok: false, error: "ANTHROPIC_API_KEY is not set." };
      }

      // Tool use rather than "please return JSON": the schema is enforced by
      // the API, so there is no parsing of prose to go wrong.
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 8192,
          system: GENERATION_SYSTEM,
          tools: [
            {
              name: "save_flashcards",
              description: "Save the flashcards generated from the material.",
              input_schema: CARD_JSON_SCHEMA,
            },
          ],
          tool_choice: { type: "tool", name: "save_flashcards" },
          messages: [
            { role: "user", content: generationUserPrompt(deckName, text) },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          ok: false,
          error: `Anthropic returned ${response.status}: ${body.slice(0, 300)}`,
        };
      }

      const data = await response.json();
      const toolUse = (data?.content ?? []).find(
        (block: { type: string }) => block.type === "tool_use",
      );

      const parsed = generatedCardSet.safeParse(toolUse?.input);
      if (!parsed.success) {
        return {
          ok: false,
          error: `Unexpected card format: ${parsed.error.issues[0]?.message ?? "unknown"}`,
        };
      }

      return { ok: true, cards: parsed.data.cards, model: anthropicModel };
    },
  };
}

// --- Mock (tests, offline) ---------------------------------------------------

function mockProvider(): AiProvider {
  return {
    name: "mock",
    model: "mock",
    async transcribePage(_png, page) {
      return {
        ok: true,
        model: "mock",
        text: `# Mock page ${page}\n\nThe Lagrangian is $L(x, \\lambda, \\mu) = f(x) + \\sum_i \\lambda_i g_i(x)$ subject to $g_i(x) \\le 0$.`,
      };
    },

    async generateCards() {
      return {
        ok: true,
        model: "mock",
        cards: [
          {
            question: "What is the Lagrangian of a constrained problem?",
            answer:
              "$L(x, \\lambda, \\mu) = f(x) + \\sum_i \\lambda_i g_i(x) + \\sum_j \\mu_j h_j(x)$",
            topic: "Lagrangian duality",
            page: 1,
          },
          {
            question:
              "Which sign restriction applies to the multipliers of equality constraints?",
            answer: "None — they are unrestricted in sign.",
            topic: "Lagrangian duality",
            page: 1,
          },
        ],
      };
    },
  };
}

export function getProvider(): AiProvider {
  switch (serverEnv().aiProvider) {
    case "ollama":
      return ollamaProvider();
    case "anthropic":
      return anthropicProvider();
    default:
      return mockProvider();
  }
}
