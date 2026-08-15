// ── Domain AI service ──────────────────────────────────────────
// The single entry point business logic uses. It orchestrates config, per-shop
// quota, redaction, timeout, retries, provider fallback, and structured
// logging — and it ALWAYS resolves to an AiResult. It never throws, so wiring
// it into ticket/invoice/delivery flows cannot break them.
//
// runCompletion()'s signature is unchanged from earlier phases; the only change
// is that configuration is now loaded from PlatformSettings (env fallback) and
// the fallback provider uses its own model/endpoint/credentials.

import { loadAiConfig } from "./config";
import { checkShopQuota } from "./quota";
import { redactForPrompt } from "./redact";
import { logAiEvent } from "./logger";
import { getProvider } from "./registry";
import {
  AiConfig,
  AiErrorKind,
  AiProviderError,
  AiRequest,
  AiResult,
  ProviderRequest,
  ProviderSlot,
} from "./types";

const TRANSIENT: AiErrorKind[] = ["timeout", "network", "rate_limit", "server"];

export async function isAiEnabled(): Promise<boolean> {
  return (await loadAiConfig()).enabled;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// Exponential backoff, capped. No jitter so behavior stays predictable/testable.
function backoffMs(attempt: number): number {
  return Math.min(2000, 100 * Math.pow(2, attempt));
}

// One provider slot, with timeout + bounded retries on transient errors only.
async function attemptSlot(
  slot: ProviderSlot,
  redactedInput: string,
  req: AiRequest,
  config: AiConfig
): Promise<{ result: AiResult; attempts: number }> {
  const provider = getProvider(slot.provider);
  const maxRetries = Math.max(0, Math.floor(config.maxRetries));
  const timeoutMs = req.timeoutMs ?? config.timeoutMs;
  let attempts = 0;
  let lastErr: AiProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const pr: ProviderRequest = {
        system: req.system,
        input: redactedInput,
        model: slot.model,
        maxTokens: req.maxTokens ?? config.maxTokens,
        temperature: req.temperature ?? config.temperature,
        signal: controller.signal,
      };
      const out = await provider.generate(pr, { baseUrl: slot.baseUrl, apiKey: slot.apiKey });
      clearTimeout(timer);
      return {
        attempts,
        result: {
          ok: true,
          text: out.text,
          finishReason: out.finishReason,
          usage: out.usage,
          provider: provider.key,
          model: slot.model,
          latencyMs: Date.now() - started,
        },
      };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e instanceof AiProviderError ? e : new AiProviderError("unknown", "provider error", false);
      const canRetry = lastErr.retryable && TRANSIENT.includes(lastErr.kind) && attempt < maxRetries;
      if (!canRetry) break;
      await sleep(backoffMs(attempt));
    }
  }

  return {
    attempts,
    result: {
      ok: false,
      provider: provider.key,
      latencyMs: 0,
      error: { kind: lastErr?.kind ?? "unknown", message: lastErr?.message ?? "provider failed" },
    },
  };
}

// Build the ordered list of provider slots (primary, then optional fallback),
// each with its own model/endpoint/credentials.
function buildSlots(config: AiConfig): ProviderSlot[] {
  const slots: ProviderSlot[] = [];
  if (config.provider !== "disabled") {
    slots.push({ provider: config.provider, model: config.model, baseUrl: config.baseUrl, apiKey: config.apiKey });
  }
  if (config.fallbackProvider) {
    slots.push({
      provider: config.fallbackProvider,
      model: config.fallbackModel || config.model,
      baseUrl: config.fallbackBaseUrl,
      apiKey: config.fallbackApiKey,
    });
  }
  return slots;
}

/**
 * Run one AI completion. Returns an AiResult in every case (success, disabled,
 * over-quota, or total failure) and never throws.
 */
export async function runCompletion(req: AiRequest): Promise<AiResult> {
  const start = Date.now();
  const config = await loadAiConfig();

  // 1) Disabled → never touch a provider.
  if (!config.enabled || config.provider === "disabled") {
    const latencyMs = Date.now() - start;
    logAiEvent({ task: req.task, provider: "none", shopId: req.shopId, outcome: "disabled", latencyMs });
    return { ok: false, provider: "none", latencyMs, error: { kind: "disabled", message: "AI is disabled" } };
  }

  // 2) Per-shop quota. Fail OPEN if the quota store is unreachable — a guard
  //    outage must never make AI unavailable (and never break a caller).
  let quotaOk = true;
  try {
    const q = await checkShopQuota(req.shopId, config);
    quotaOk = q.ok;
  } catch {
    quotaOk = true;
  }
  if (!quotaOk) {
    const latencyMs = Date.now() - start;
    logAiEvent({
      task: req.task,
      provider: config.provider,
      model: config.model,
      shopId: req.shopId,
      outcome: "quota_exceeded",
      latencyMs,
    });
    return { ok: false, provider: "none", latencyMs, error: { kind: "quota_exceeded", message: "shop AI quota exceeded" } };
  }

  // 3) Redact before anything leaves Peyvo.
  const redactedInput = redactForPrompt(req.input);

  // 4) Primary, then optional fallback slot (each with its own endpoint/creds).
  let last: AiResult | null = null;
  for (const slot of buildSlots(config)) {
    const { result, attempts } = await attemptSlot(slot, redactedInput, req, config);
    last = result;
    if (result.ok) {
      const latencyMs = Date.now() - start;
      logAiEvent({
        task: req.task,
        provider: result.provider,
        model: result.model,
        shopId: req.shopId,
        outcome: "ok",
        latencyMs,
        attempts,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
      });
      return { ...result, latencyMs };
    }
    logAiEvent({
      task: req.task,
      provider: slot.provider,
      model: slot.model,
      shopId: req.shopId,
      outcome: "error",
      latencyMs: Date.now() - start,
      attempts,
      errorKind: result.error?.kind,
    });
  }

  // 5) All providers failed — safe negative result, never throw.
  return {
    ok: false,
    provider: "none",
    latencyMs: Date.now() - start,
    error: last?.error ?? { kind: "unknown", message: "all providers failed" },
  };
}
