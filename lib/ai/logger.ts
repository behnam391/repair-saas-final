// ── Structured, content-free AI logging ────────────────────────
// By construction this module accepts ONLY metadata. There is no parameter for
// prompt text, response text, or any customer/device data, so sensitive
// content cannot be logged through it. One JSON line per event keeps it easy
// to ship to any log aggregator later.

import type { AiErrorKind } from "./types";

export interface AiLogEvent {
  task: string;
  provider: string;
  model?: string;
  shopId: string;
  outcome: "ok" | "error" | "disabled" | "quota_exceeded";
  latencyMs: number;
  attempts?: number;
  promptTokens?: number;
  completionTokens?: number;
  errorKind?: AiErrorKind;
}

export function logAiEvent(e: AiLogEvent): void {
  try {
    // Note: only the fields declared on AiLogEvent are emitted — no content.
    console.log(JSON.stringify({ evt: "ai", at: new Date().toISOString(), ...e }));
  } catch {
    // Logging must never throw into the caller.
  }
}
