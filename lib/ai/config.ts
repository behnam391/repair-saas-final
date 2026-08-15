// ── AI configuration (server-side only) ────────────────────────
// Resolves the effective AiConfig from environment variables. Credentials
// (AI_API_KEY) live only in the server environment and are never exposed to
// the client. This is intentionally the single source of config today; a later
// phase can overlay PlatformSettings values here WITHOUT changing any caller,
// because everything above only depends on loadAiConfig()'s return shape.

import type { AiConfig, ProviderKey } from "./types";

const VALID_PROVIDERS: ProviderKey[] = ["disabled", "mock", "openai-compat"];

function asProvider(v: string | undefined, fallback: ProviderKey): ProviderKey {
  return v && (VALID_PROVIDERS as string[]).includes(v) ? (v as ProviderKey) : fallback;
}

function num(v: string | undefined, d: number): number {
  const n = v != null && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : d;
}

function bool(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

export function loadAiConfig(): AiConfig {
  const provider = asProvider(process.env.AI_PROVIDER, "disabled");
  // "enabled" requires BOTH the flag and a non-disabled provider, so a stray
  // AI_ENABLED=true can never accidentally start calling a provider.
  const enabled = bool(process.env.AI_ENABLED) && provider !== "disabled";

  const rawFallback = process.env.AI_FALLBACK_PROVIDER
    ? asProvider(process.env.AI_FALLBACK_PROVIDER, "disabled")
    : null;
  // A fallback that is "disabled" or identical to the primary is meaningless.
  const fallbackProvider = rawFallback && rawFallback !== "disabled" && rawFallback !== provider ? rawFallback : null;

  return {
    enabled,
    provider,
    fallbackProvider,
    model: process.env.AI_MODEL || "mock-model",
    baseUrl: process.env.AI_BASE_URL || undefined,
    apiKey: process.env.AI_API_KEY || undefined,
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 20000),
    maxRetries: num(process.env.AI_MAX_RETRIES, 2),
    maxTokens: num(process.env.AI_MAX_TOKENS, 1024),
    temperature: num(process.env.AI_TEMPERATURE, 0.2),
    shopDailyLimit: num(process.env.AI_SHOP_DAILY_LIMIT, 200),
  };
}
