// ── Provider-agnostic AI foundation: normalized contracts ──────
// These types are the ONLY vocabulary shared between the domain service and
// the individual providers. No provider-specific concept (OpenAI response
// shapes, Anthropic message blocks, etc.) is allowed to leak above the
// provider adapters. Business logic imports from "@/lib/ai" (index.ts) and
// never sees anything in providers/*.

export type ProviderKey = "disabled" | "mock" | "openai-compat";

export type AiErrorKind =
  | "disabled" // AI turned off by config
  | "quota_exceeded" // per-shop usage cap hit
  | "timeout" // provider exceeded the deadline
  | "network" // transport failure reaching the provider
  | "rate_limit" // provider throttled us (HTTP 429)
  | "auth" // bad/missing credentials (HTTP 401/403)
  | "bad_request" // provider rejected the request (4xx)
  | "server" // provider-side failure (5xx)
  | "invalid_config" // e.g. baseUrl missing for an HTTP provider
  | "invalid_response" // provider returned something unparseable
  | "unknown";

// Thrown INSIDE a provider adapter; the service catches it and never lets it
// escape to business logic. `retryable` lets the service decide on retries.
export class AiProviderError extends Error {
  kind: AiErrorKind;
  retryable: boolean;
  constructor(kind: AiErrorKind, message: string, retryable = false) {
    super(message);
    this.name = "AiProviderError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface AiUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// ── Domain layer ───────────────────────────────────────────────
// What a future feature asks the domain service for. `task` is a stable label
// used only for logs/metrics (e.g. "intake.summarize"); it never changes
// behavior. `input` is redacted by the service before it reaches any provider.
export interface AiRequest {
  shopId: string;
  task: string;
  system: string;
  input: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

// What the domain service ALWAYS returns (never throws). On any failure `ok`
// is false and `error.message` is a safe, generic string (no PII, no provider
// internals).
export interface AiResult {
  ok: boolean;
  text?: string;
  finishReason?: string;
  usage?: AiUsage;
  provider: string; // provider that answered, or "none"
  model?: string;
  latencyMs: number;
  error?: { kind: AiErrorKind; message: string };
}

// ── Provider layer ─────────────────────────────────────────────
// The normalized request handed to a provider. `input` is ALREADY redacted by
// the service. `signal` enforces the timeout.
export interface ProviderRequest {
  system: string;
  input: string;
  model: string;
  maxTokens: number;
  temperature: number;
  signal: AbortSignal;
}

export interface ProviderResult {
  text: string;
  finishReason?: string;
  usage?: AiUsage;
}

// Credentials/endpoint for a provider call. Sourced server-side only.
export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
}

export interface AiProvider {
  readonly key: string;
  generate(req: ProviderRequest, cfg: ProviderConfig): Promise<ProviderResult>;
}

// Effective, resolved configuration for one run. The fallback slot carries its
// OWN model/baseUrl/apiKey, so the fallback provider can be a completely
// different endpoint from the primary.
export interface AiConfig {
  enabled: boolean;
  provider: ProviderKey;
  fallbackProvider: ProviderKey | null;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  fallbackModel?: string;
  fallbackBaseUrl?: string;
  fallbackApiKey?: string;
  timeoutMs: number;
  maxRetries: number;
  maxTokens: number;
  temperature: number;
  shopDailyLimit: number; // 0 = unlimited
}

// Internal: one resolved provider "slot" (primary or fallback) — provider key
// plus the exact model/endpoint/credentials to use for it.
export interface ProviderSlot {
  provider: ProviderKey;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}
