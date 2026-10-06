export type MarketingAdvisorMode = "growth" | "strategy" | "council";

export type MarketingAdvisorResult = {
  executiveSummary: string;
  diagnosis: string[];
  decisions: string[];
  plan7: string[];
  plan30: string[];
  plan90: string[];
  kpis: { name: string; target: string; why: string }[];
  experiments: string[];
  risks: string[];
};

const SHAPE = `{
  "executiveSummary": "string",
  "diagnosis": ["string"],
  "decisions": ["string"],
  "plan7": ["string"],
  "plan30": ["string"],
  "plan90": ["string"],
  "kpis": [{"name":"string","target":"string","why":"string"}],
  "experiments": ["string"],
  "risks": ["string"]
}`;

const GROWTH_FRAMEWORK = [
  "Evaluate the market by painful problem, purchasing power, ease of reaching buyers, and market growth.",
  "Use a value equation: increase desired outcome and perceived likelihood; reduce time delay and customer effort.",
  "Build an ethical offer from the core result, delivery steps, useful bonuses, risk reversal, honest constraints, and clear price logic.",
  "Choose lead channels from warm outreach, useful public content, targeted cold outreach, and paid distribution; do not recommend paid media when budget is zero.",
  "Design lead magnet, conversion path, follow-up, onboarding, activation, retention, referral, and expansion as one measurable system.",
  "Never invent scarcity, guarantees, testimonials, revenue, users, or product capabilities.",
].join("\n- ");

const STRATEGY_FRAMEWORK = [
  "Start with market and customer insight, competitors/substitutes, company capability, and measurable objectives.",
  "Apply STP: segment by meaningful needs/behavior/economics, select priority segments, then write a differentiated positioning statement.",
  "Evaluate Product, Price, Place, Promotion and, for a service, People, Process, and Physical Evidence.",
  "Connect acquisition with customer value, satisfaction, loyalty, channels, integrated communication, metrics, and control.",
  "Make explicit choices about who Peyvo is for now and who is not a priority yet.",
  "Do not invent research findings; label assumptions and recommend a validation method.",
].join("\n- ");

export function buildMarketingAdvisorPrompt(args: {
  mode: MarketingAdvisorMode;
  objective: string;
  audience: string;
  constraints?: string;
  snapshot: Record<string, unknown>;
}) {
  const lens = args.mode === "growth"
    ? `GROWTH AND OFFER LENS:\n- ${GROWTH_FRAMEWORK}`
    : args.mode === "strategy"
      ? `MARKET STRATEGY LENS:\n- ${STRATEGY_FRAMEWORK}`
      : `MARKET STRATEGY LENS (apply first):\n- ${STRATEGY_FRAMEWORK}\n\nGROWTH AND OFFER LENS (apply second):\n- ${GROWTH_FRAMEWORK}`;
  const system = [
    "You are Peyvo's internal marketing decision-support system.",
    "You are NOT Alex Hormozi or Philip Kotler, must not impersonate either person, and must not claim endorsement or affiliation.",
    "Use only general, publicly described marketing frameworks. Do not quote or reproduce books, courses, or proprietary passages.",
    lens,
    "Answer in clear Persian for an Iranian SaaS founder with limited budget.",
    "Use the supplied aggregate snapshot only. It contains no personal customer data.",
    "Prioritize specific decisions and low-cost execution over generic motivation.",
    "Separate observed facts from assumptions. Every suggested experiment needs a measurable success condition.",
    "Return ONLY valid JSON, no markdown and no prose outside JSON, in exactly this shape:",
    SHAPE,
  ].join("\n");
  const input = [
    `هدف مدیر: ${args.objective}`,
    `بازار یا مخاطب مدنظر: ${args.audience}`,
    `محدودیت‌ها: ${args.constraints || "بودجه تبلیغاتی محدود؛ اولویت با کانال‌های کم‌هزینه"}`,
    `نمای تجمیعی پیوو: ${JSON.stringify(args.snapshot)}`,
  ].join("\n");
  return { system, input };
}

function strings(value: unknown, max = 8): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, max).map(item => item.trim()) : [];
}

export function parseMarketingAdvisorResult(text?: string | null): MarketingAdvisorResult | null {
  if (!text) return null;
  const unfenced = text.replace(/```json|```/gi, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(unfenced.slice(start, end + 1));
    if (!value || typeof value !== "object") return null;
    const executiveSummary = typeof value.executiveSummary === "string" ? value.executiveSummary.trim() : "";
    const kpis = Array.isArray(value.kpis) ? value.kpis.slice(0, 8).flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      return typeof row.name === "string" && typeof row.target === "string" ? [{ name: row.name.trim(), target: row.target.trim(), why: typeof row.why === "string" ? row.why.trim() : "" }] : [];
    }) : [];
    if (!executiveSummary) return null;
    return { executiveSummary, diagnosis: strings(value.diagnosis), decisions: strings(value.decisions), plan7: strings(value.plan7), plan30: strings(value.plan30), plan90: strings(value.plan90), kpis, experiments: strings(value.experiments), risks: strings(value.risks) };
  } catch { return null; }
}
