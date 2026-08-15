// ── Public surface of the AI foundation ────────────────────────
// Business logic imports ONLY from here. It must never import a provider
// adapter, a vendor SDK, or reach into lib/ai/providers/*. Switching providers
// is done through configuration (see lib/ai/config.ts), not by changing any
// caller of these functions.

export { runCompletion, isAiEnabled } from "./service";
export { loadAiConfig } from "./config";
export { redactForPrompt } from "./redact";
export type { AiRequest, AiResult, AiUsage, AiErrorKind, AiConfig, ProviderKey } from "./types";
