// OpenAI-compatible Chat Completions adapter — ARCHITECTURE ONLY.
//
// Speaks the widely-implemented POST {baseUrl}/chat/completions shape, so the
// SAME adapter works against OpenAI, most gateways/proxies, and self-hosted
// runtimes (Ollama, vLLM, LM Studio) purely by changing AI_BASE_URL. It uses
// the built-in fetch — NO vendor SDK is imported anywhere. No real provider or
// credentials are shipped, and it is not selected by default (config defaults
// to "disabled"); it exists so switching to a real endpoint later is config,
// not code.

import { AiProvider, AiProviderError, ProviderConfig, ProviderRequest, ProviderResult } from "../types";

export class OpenAiCompatProvider implements AiProvider {
  readonly key = "openai-compat";

  async generate(req: ProviderRequest, cfg: ProviderConfig): Promise<ProviderResult> {
    if (!cfg.baseUrl) {
      throw new AiProviderError("invalid_config", "AI_BASE_URL is not configured", false);
    }
    const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: req.model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.input },
          ],
          // GPT-5 family uses max_completion_tokens. Older/OpenAI-compatible
          // models generally use max_tokens, so retain that shape for them.
          ...(req.model.startsWith("gpt-5")
            ? { max_completion_tokens: req.maxTokens }
            : { max_tokens: req.maxTokens, temperature: req.temperature }),
          // Hetzner documents the standard chat-completions shape but does not
          // advertise JSON mode. The prompt already requires strict JSON, so
          // omit this optional OpenAI extension for maximum compatibility.
          ...(req.responseFormat === "json" && !cfg.baseUrl.includes("inference.hetzner.com")
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
        signal: req.signal,
      });
    } catch (e: any) {
      // AbortController firing surfaces as an AbortError → treat as timeout.
      if (e?.name === "AbortError") throw new AiProviderError("timeout", "request timed out", true);
      throw new AiProviderError("network", "network error reaching provider", true);
    }

    if (!res.ok) {
      const kind =
        res.status === 401 || res.status === 403
          ? "auth"
          : res.status === 429
            ? "rate_limit"
            : res.status >= 500
              ? "server"
              : "bad_request";
      const retryable = kind === "rate_limit" || kind === "server";
      throw new AiProviderError(kind, `provider returned HTTP ${res.status}`, retryable);
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new AiProviderError("invalid_response", "provider returned non-JSON", false);
    }

    const content = data?.choices?.[0]?.message?.content;
    // Most providers return a string. Some OpenAI-compatible gateways return
    // an array of typed text parts, so normalize both without leaking their
    // provider-specific response shape into the rest of the application.
    const text = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((part: any) => typeof part === "string" ? part : part?.text ?? "").join("")
        : undefined;
    if (typeof text !== "string") {
      throw new AiProviderError("invalid_response", "missing choices[0].message.content", false);
    }
    const u = data?.usage ?? {};
    return {
      text,
      finishReason: data?.choices?.[0]?.finish_reason,
      usage: {
        promptTokens: u.prompt_tokens,
        completionTokens: u.completion_tokens,
        totalTokens: u.total_tokens,
      },
    };
  }
}
