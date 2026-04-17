import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export const MODELS = {
  primary: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
  fast: process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001",
} as const;

/**
 * Thin wrapper with prompt caching enabled by default on the system prompt.
 * Agents use this; if ANTHROPIC_API_KEY is unset, returns a stub response
 * so the app remains functional in dev without external creds.
 */
export async function complete(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheSystem?: boolean;
}): Promise<{ text: string; tokensIn: number; tokensOut: number; model: string; stubbed: boolean }> {
  if (!anthropic) {
    return {
      text: `[stub:${opts.model ?? MODELS.primary}] ${opts.user.slice(0, 120)}...`,
      tokensIn: 0,
      tokensOut: 0,
      model: opts.model ?? MODELS.primary,
      stubbed: true,
    };
  }

  const system = opts.cacheSystem !== false
    ? [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }]
    : opts.system;

  const res = await anthropic.messages.create({
    model: opts.model ?? MODELS.primary,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.3,
    system: system as never,
    messages: [{ role: "user", content: opts.user }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");

  return {
    text,
    tokensIn: res.usage.input_tokens,
    tokensOut: res.usage.output_tokens,
    model: res.model,
    stubbed: false,
  };
}
