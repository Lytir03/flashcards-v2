/**
 * Central env access. Fails loudly at import time rather than producing a
 * confusing "Invalid API key" from Supabase three layers down.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in ` +
        `(\`supabase start\` prints the Supabase values).`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Server-only. Never import from a Client Component. */
export function serverEnv() {
  return {
    supabaseSecretKey: required(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY,
    ),
    aiProvider: (process.env.AI_PROVIDER ?? "mock") as
      | "ollama"
      | "anthropic"
      | "mock",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
    ollamaModel: process.env.OLLAMA_MODEL ?? "qwen3:8b",
    ollamaVisionModel: process.env.OLLAMA_VISION_MODEL ?? "qwen2.5vl:7b",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  };
}
