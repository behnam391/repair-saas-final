// ── AI task: Intake Helper (advisory) ──────────────────────────
// Pure, provider-agnostic helpers for the "Peyvo AI Repair Assistant — Intake
// Helper" slice: build the prompt from minimal intake context, and parse the
// model's reply into three plain-text sections. No provider import, no DB, no
// side effects — so this is fully unit-testable. It NEVER diagnoses and NEVER
// prices; the prompt and the disclaimer enforce "suggestion, not certainty".

export interface IntakeContext {
  deviceModel: string;
  laneLabel: string;
  issueInitial: string;
  customerDamageNotes?: string | null;
}

export interface IntakeHelperResult {
  summary: string;
  questions: string[];
  customerExplanation: string;
}

export const INTAKE_HELPER_DISCLAIMER =
  "این خروجی پیشنهاد هوش مصنوعی است، نه تشخیص قطعی. همه موارد صرفاً پیشنهاد هستند و تصمیم نهایی با تعمیرکار است.";

// Build the system + user messages. `input` carries ONLY minimal intake fields;
// the lib/ai service redacts it again before any provider sees it.
export function buildIntakeHelperPrompt(ctx: IntakeContext): { system: string; input: string } {
  const system = [
    "You help a mobile-phone repair technician organize a repair INTAKE.",
    "You DO NOT diagnose the fault, and you DO NOT estimate or mention any price.",
    "Everything you output is a SUGGESTION and must be phrased tentatively — never as a certainty.",
    "Write the values in Persian (Farsi).",
    "Return ONLY strict JSON (no prose, no code fences) with exactly these keys:",
    '{"summary": string, "questions": string[], "customerExplanation": string}',
    "- summary: a short, neutral restatement of the reported problem, with NO conclusions.",
    "- questions: clarifying/missing-information questions that would help complete the intake (array of short strings).",
    "- customerExplanation: a friendly, plain-language note for the customer about next steps — with NO diagnosis and NO price.",
  ].join("\n");

  const input = [
    `Device model: ${ctx.deviceModel}`,
    `Repair lane: ${ctx.laneLabel}`,
    `Reported issue: ${ctx.issueInitial}`,
    ctx.customerDamageNotes ? `Pre-existing damage notes: ${ctx.customerDamageNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, input };
}

// Tolerant extractor: accept raw JSON, ```json fenced blocks, or JSON embedded
// in prose. Returns the first balanced-looking {...} slice, or null.
function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

/**
 * Parse a model reply into the three sections. Returns null when the reply is
 * missing/unparseable or carries no usable content — the route maps null to a
 * clean "empty" state rather than showing junk.
 */
export function parseIntakeHelperResult(text: string | undefined | null): IntakeHelperResult | null {
  if (!text) return null;
  const json = extractJson(text);
  if (!json) {
    // Last-resort compatibility for providers that ignore JSON mode: never
    // discard a non-empty answer. Present it as a neutral summary while the
    // disclaimer still makes clear that it is only an AI suggestion.
    const summary = text.replace(/```(?:json)?|```/gi, "").trim().slice(0, 4000);
    return summary ? { summary, questions: [], customerExplanation: "" } : null;
  }

  let obj: any;
  try {
    obj = JSON.parse(json);
  } catch {
    const summary = text.replace(/```(?:json)?|```/gi, "").trim().slice(0, 4000);
    return summary ? { summary, questions: [], customerExplanation: "" } : null;
  }
  if (!obj || typeof obj !== "object") return null;

  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  const customerExplanation = typeof obj.customerExplanation === "string" ? obj.customerExplanation.trim() : "";
  const questions = Array.isArray(obj.questions)
    ? obj.questions.filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 0).map((q: string) => q.trim())
    : [];

  if (!summary && !customerExplanation && questions.length === 0) return null;
  return { summary, questions, customerExplanation };
}
