// ── Domain AI service ──────────────────────────────────────────
// The single entry point business logic uses. It orchestrates config, per-shop
// quota, redaction, timeout, retries, provider fallback, and structured
// logging — and it ALWAYS resolves to an AiResult. It never throws, so wiring
// it into ticket/invoice/delivery flows later cannot break them.

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
  ProviderKey,
  ProviderRequest,
} from "./types";

const TRANSIENT: AiErrorKind[] = ["timeout", "network", "rate_limit", "server"];

export function isAiEnabled(): boolean {
  return loadAiConfig().enabled;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// Exponential backoff, capped. No jitter so behavior stays predictable/testable.
function backoffMs(attempt: number): number {
  return Math.min(2000, 100 * Math.pow(2, attempt));
}

// One provider, with timeout + bounded retries on transient errors only.
async function attemptProvider(
  providerKey: ProviderKey,
  redactedInput: string,
  req: AiRequest,
  config: AiConfig
): Promise<{ result: AiResult; attempts: number }> {
  const provider = getProvider(providerKey);
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
        model: config.model,
        maxTokens: req.maxTokens ?? config.maxTokens,
        temperature: req.temperature ?? config.temperature,
        signal: controller.signal,
      };
      const out = await provider.generate(pr, { baseUrl: config.baseUrl, apiKey: config.apiKey });
      clearTimeout(timer);
      return {
        attempts,
        result: {
          ok: true,
          text: out.text,
          finishReason: out.finishReason,
          usage: out.usage,
          provider: provider.key,
          model: config.model,
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

/**
 * Run one AI completion. Returns an AiResult in every case (success, disabled,
 * over-quota, or total failure) and never throws.
 */
export async function runCompletion(req: AiRequest): Promise<AiResult> {
  const start = Date.now();
  const config = loadAiConfig();

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

  // 4) Primary, then optional fallback provider.
  const chain: ProviderKey[] = [config.provider, ...(config.fallbackProvider ? [config.fallbackProvider] : [])];
  let last: AiResult | null = null;

  for (const providerKey of chain) {
    const { result, attempts } = await attemptProvider(providerKey, redactedInput, req, config);
    last = result;
    if (result.ok) {
      const latencyMs = Date.now() - start;
      logAiEvent({
        task: req.task,
        provider: result.provider,
        model: config.model,
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
      provider: providerKey,
      model: config.model,
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
