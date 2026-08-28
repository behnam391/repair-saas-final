// ── Connection probe (Super Admin "Test Connection") ───────────
// A minimal, single-shot server-side AI request used only to verify provider
// configuration from the Super Admin panel. It reuses the same config, provider
// registry, and redaction as the domain service — no provider SDK, no business
// logic touched. It deliberately runs the PRIMARY provider even when AI is
// globally disabled, so credentials can be validated BEFORE enabling AI. It
// bypasses the per-shop quota (this is an admin action, not shop traffic) and
// returns only safe, generic messages — never the API key or provider internals.

import { loadAiConfig } from "./config";
import { getProvider } from "./registry";
import { redactForPrompt } from "./redact";
import { AiErrorKind, AiProviderError } from "./types";

export interface ProbeResult {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  error?: { kind: AiErrorKind; message: string };
}

function safeMessage(kind: AiErrorKind): string {
  switch (kind) {
    case "disabled":
      return "ابتدا یک ارائه‌دهنده انتخاب کنید.";
    case "invalid_config":
      return "پیکربندی ناقص است (برای این ارائه‌دهنده، آدرس سرویس لازم است).";
    case "auth":
      return "کلید API نامعتبر است یا دسترسی رد شد.";
    case "timeout":
      return "زمان پاسخ‌گویی به پایان رسید.";
    case "network":
      return "ارتباط با سرویس برقرار نشد.";
    case "rate_limit":
      return "محدودیت نرخ سرویس‌دهنده فعال شد.";
    case "server":
      return "خطای سمت سرویس‌دهنده.";
    case "invalid_response":
      return "پاسخ سرویس قابل‌خواندن نبود.";
    case "bad_request":
      return "درخواست توسط سرویس رد شد.";
    default:
      return "خطای ناشناخته در اتصال.";
  }
}

export async function probeAiConnection(): Promise<ProbeResult> {
  const config = await loadAiConfig();
  const provider = config.provider;
  const model = config.model;

  if (provider === "disabled") {
    return { ok: false, provider, model, latencyMs: 0, error: { kind: "disabled", message: safeMessage("disabled") } };
  }

  const impl = getProvider(provider);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const start = Date.now();
  try {
    await impl.generate(
      {
        system: "Connectivity probe. Reply with the single word: OK.",
        input: redactForPrompt("ping"),
        model,
        // Reasoning-capable open models (including Hetzner's Qwen models)
        // may consume a small completion budget before producing visible
        // text. Eight tokens can therefore yield a valid 200 response with
        // empty content; 256 remains tiny but is enough for a reliable probe.
        maxTokens: provider === "mock" ? 8 : 256,
        temperature: 0,
        signal: controller.signal,
      },
      { baseUrl: config.baseUrl, apiKey: config.apiKey }
    );
    clearTimeout(timer);
    return { ok: true, provider, model, latencyMs: Date.now() - start };
  } catch (e) {
    clearTimeout(timer);
    const err = e instanceof AiProviderError ? e : new AiProviderError("unknown", "error", false);
    return { ok: false, provider, model, latencyMs: Date.now() - start, error: { kind: err.kind, message: safeMessage(err.kind) } };
  }
}
