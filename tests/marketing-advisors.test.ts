import test from "node:test";
import assert from "node:assert/strict";
import { buildMarketingAdvisorPrompt, parseMarketingAdvisorResult } from "../lib/ai/tasks/marketing-advisors";

test("marketing advisor refuses impersonation and requires aggregate evidence", () => {
  const prompt = buildMarketingAdvisorPrompt({ mode: "council", objective: "افزایش ثبت نام فعال", audience: "تعمیرکار موبایل", snapshot: { shops: { total: 10 } } });
  assert.match(prompt.system, /NOT Alex Hormozi or Philip Kotler/);
  assert.match(prompt.system, /general, publicly described marketing frameworks/);
  assert.match(prompt.system, /observed facts from assumptions/i);
  assert.doesNotMatch(prompt.input, /phone|customerName/i);
});

test("marketing advisor parses the controlled decision schema", () => {
  const parsed = parseMarketingAdvisorResult(JSON.stringify({ executiveSummary: "تمرکز روی یک صنف", diagnosis: ["فعال‌سازی پایین"], decisions: ["تمرکز"], plan7: ["مصاحبه"], plan30: ["آزمایش"], plan90: ["گسترش"], kpis: [{ name: "فعال‌سازی", target: "۳۰٪", why: "ارزش" }], experiments: ["صفحه فرود"], risks: ["پراکندگی"] }));
  assert.equal(parsed?.executiveSummary, "تمرکز روی یک صنف");
  assert.equal(parsed?.kpis[0].target, "۳۰٪");
});

test("marketing advisor rejects prose-only output", () => {
  assert.equal(parseMarketingAdvisorResult("یک پاسخ معمولی"), null);
});
