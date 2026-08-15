// ── PII redaction ──────────────────────────────────────────────
// Best-effort masking applied by the service to EVERY prompt input before it
// leaves Peyvo for a provider, and available for scrubbing any text that might
// otherwise be logged. The AI foundation reasons about symptoms and device
// models — not identities — so contact details and long identifiers are
// stripped. This is defensive: no real provider is wired yet.

const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
// Iranian mobile numbers in the common shapes (+989…, 09…, 9…).
const IRAN_MOBILE = /(?:\+?98|0)?9\d{9}\b/g;
// IMEIs are 15–16 digits; mask them before the general long-number rule.
const IMEI = /\b\d{15,16}\b/g;
// Any remaining long digit run (card numbers, account numbers, etc.).
const LONG_NUMBER = /\b\d{7,}\b/g;

/** Mask contact details / long identifiers in free text before it is sent. */
export function redactForPrompt(text: string): string {
  return String(text ?? "")
    .replace(EMAIL, "[email]")
    .replace(IMEI, "[imei]")
    .replace(IRAN_MOBILE, "[phone]")
    .replace(LONG_NUMBER, "[number]");
}
