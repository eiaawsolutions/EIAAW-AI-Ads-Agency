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
export type CompleteResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  stubbed: boolean;
  stopReason: string | null;
};

export async function complete(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheSystem?: boolean;
}): Promise<CompleteResult> {
  if (!anthropic) {
    return {
      text: `[stub:${opts.model ?? MODELS.primary}] ${opts.user.slice(0, 120)}...`,
      tokensIn: 0,
      tokensOut: 0,
      model: opts.model ?? MODELS.primary,
      stubbed: true,
      stopReason: "stub",
    };
  }

  const system = opts.cacheSystem !== false
    ? [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }]
    : opts.system;

  const res = await anthropic.messages.create({
    model: opts.model ?? MODELS.primary,
    max_tokens: opts.maxTokens ?? 4096,
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
    stopReason: res.stop_reason ?? null,
  };
}

export type StructuredResult<T> = {
  data: T | null;
  tokensIn: number;
  tokensOut: number;
  model: string;
  stubbed: boolean;
  stopReason: string | null;
  /** Set when the model refused to call the tool or returned a non-tool block. */
  toolError: string | null;
};

/**
 * Structured-output completion via Anthropic's tool_use. The model is
 * forced to call a single tool whose `input_schema` matches `schema`,
 * eliminating the entire JSON-parse class of failures (truncation,
 * unescaped quotes, code fences). No text parsing required — the SDK
 * delivers a typed object straight from the tool block.
 *
 * Stubbed when ANTHROPIC_API_KEY is unset; caller supplies stubData.
 */
export async function structuredComplete<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  stubData: T;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheSystem?: boolean;
}): Promise<StructuredResult<T>> {
  if (!anthropic) {
    return {
      data: opts.stubData,
      tokensIn: 0,
      tokensOut: 0,
      model: opts.model ?? MODELS.primary,
      stubbed: true,
      stopReason: "stub",
      toolError: null,
    };
  }

  const system = opts.cacheSystem !== false
    ? [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }]
    : opts.system;

  const res = await anthropic.messages.create({
    model: opts.model ?? MODELS.primary,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.2,
    system: system as never,
    messages: [{ role: "user", content: opts.user }],
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.schema as never,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
  });

  const toolBlock = res.content.find((b) => b.type === "tool_use") as
    | { type: "tool_use"; name: string; input: T }
    | undefined;

  return {
    data: toolBlock ? (toolBlock.input as T) : null,
    tokensIn: res.usage.input_tokens,
    tokensOut: res.usage.output_tokens,
    model: res.model,
    stubbed: false,
    stopReason: res.stop_reason ?? null,
    toolError: toolBlock ? null : "model did not invoke the requested tool",
  };
}
