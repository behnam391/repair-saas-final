// ── AI configuration (server-side only) ────────────────────────
// Resolves the effective AiConfig with per-field precedence:
//
//     PlatformSettings value (if set)  →  environment variable  →  default
//
// PlatformSettings (edited by the Super Admin) is authoritative; environment
// variables remain a safe fallback for development. Secrets (API keys) are
// stored ENCRYPTED in PlatformSettings and decrypted here via lib/crypto —
// they never leave the server. Reading the DB is wrapped so a DB outage (or
// dev with no row) falls back cleanly to env + defaults and never throws.

import { db } from "../db";
import { decryptSecret } from "../crypto";
import type { AiConfig, ProviderKey } from "./types";

const VALID_PROVIDERS: ProviderKey[] = ["disabled", "mock", "openai-compat"];

function toProvider(v: unknown): ProviderKey | undefined {
  return typeof v === "string" && (VALID_PROVIDERS as string[]).includes(v) ? (v as ProviderKey) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}
function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}
// A decrypted secret from the DB, or undefined if empty/unreadable.
function secret(v: unknown): string | undefined {
  const d = decryptSecret(typeof v === "string" ? v : null);
  const clean = d.trim();
  return clean || undefined;
}

export async function loadAiConfig(): Promise<AiConfig> {
  let s: any = null;
  // Node's test runner marks worker processes with NODE_TEST_CONTEXT. Tests
  // intentionally provide a complete AI_* environment and must never read or
  // mutate the live PlatformSettings row just because DATABASE_URL is present.
  if (!process.env.NODE_TEST_CONTEXT) {
    try {
      s = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    } catch {
      s = null; // dev / DB unavailable → env + defaults
    }
  }

  const apiKey = secret(s?.aiApiKey) ?? str(process.env.AI_API_KEY);
  const configuredModel = str(s?.aiModel) ?? str(process.env.AI_MODEL);
  const configuredBaseUrl = str(s?.aiBaseUrl) ?? str(process.env.AI_BASE_URL);
  const selectedProvider = toProvider(s?.aiProvider) ?? toProvider(process.env.AI_PROVIDER) ?? "disabled";
  // Repair legacy panel state where the OpenAI preset stored its token/model
  // but the old `mock` provider selection survived. A real token together
  // with an OpenAI model or endpoint is unambiguous and must never hit mock.
  const looksLikeOpenAi = !!apiKey && (
    configuredBaseUrl?.includes("api.openai.com") || configuredModel?.startsWith("gpt-")
  );
  const provider: ProviderKey = selectedProvider === "mock" && looksLikeOpenAi ? "openai-compat" : selectedProvider;
  const enabledRaw = bool(s?.aiEnabled) ?? bool(process.env.AI_ENABLED) ?? false;
  const enabled = enabledRaw && provider !== "disabled";

  const fbRaw = toProvider(s?.aiFallbackProvider) ?? toProvider(process.env.AI_FALLBACK_PROVIDER) ?? "disabled";
  // A second model on the same OpenAI-compatible gateway is a valid fallback
  // (for example Qwen -> DeepSeek through one Hetzner Inference account).
  const fallbackProvider = fbRaw !== "disabled" ? fbRaw : null;
  // The super-admin UI calls the OpenAI-compatible adapter for both OpenAI
  // and custom gateways. When an OpenAI token is present and no custom
  // endpoint/model was supplied, choose safe official defaults so merely
  // saving the token is sufficient. A manually entered Base URL or model
  // always wins, preserving support for other compatible providers.
  const isTokenOnlyOpenAi = provider === "openai-compat" && !!apiKey;
  const model = isTokenOnlyOpenAi && (!configuredModel || configuredModel === "mock-model")
    ? "gpt-5-mini"
    : configuredModel ?? "mock-model";
  const configuredTimeout = num(s?.aiTimeoutMs) ?? num(process.env.AI_TIMEOUT_MS) ?? 20000;
  const isHetznerInference = configuredBaseUrl?.includes("inference.hetzner.com") ?? false;

  return {
    enabled,
    provider,
    fallbackProvider,
    model,
    baseUrl: configuredBaseUrl ?? (isTokenOnlyOpenAi ? "https://api.openai.com/v1" : undefined),
    apiKey,
    fallbackModel: str(s?.aiFallbackModel) ?? str(process.env.AI_FALLBACK_MODEL),
    fallbackBaseUrl: str(s?.aiFallbackBaseUrl) ?? str(process.env.AI_FALLBACK_BASE_URL) ?? (fallbackProvider === provider ? configuredBaseUrl : undefined),
    fallbackApiKey: secret(s?.aiFallbackApiKey) ?? str(process.env.AI_FALLBACK_API_KEY) ?? (fallbackProvider === provider ? apiKey : undefined),
    timeoutMs: isHetznerInference ? Math.max(configuredTimeout, 75000) : configuredTimeout,
    maxRetries: num(s?.aiMaxRetries) ?? num(process.env.AI_MAX_RETRIES) ?? 2,
    maxTokens: num(process.env.AI_MAX_TOKENS) ?? 1024, // not exposed in the admin UI
    temperature: num(process.env.AI_TEMPERATURE) ?? 0.2,
    shopDailyLimit: num(s?.aiShopDailyLimit) ?? num(process.env.AI_SHOP_DAILY_LIMIT) ?? 200,
  };
}
