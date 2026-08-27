import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntakeHelperPrompt,
  parseIntakeHelperResult,
  INTAKE_HELPER_DISCLAIMER,
} from "../lib/ai/tasks/intake-helper";

test("prompt includes minimal intake fields and forbids diagnosis/price", () => {
  const { system, input } = buildIntakeHelperPrompt({
    deviceModel: "Samsung A54",
    laneLabel: "سخت‌افزار",
    issueInitial: "روشن نمی‌شود",
    customerDamageNotes: "قبلاً افتاده",
  });
  assert.match(input, /Samsung A54/);
  assert.match(input, /سخت‌افزار/);
  assert.match(input, /روشن نمی‌شود/);
  assert.match(input, /قبلاً افتاده/);
  assert.match(system, /DO NOT diagnose/i);
  assert.match(system, /DO NOT estimate or mention any price/i);
  assert.match(system, /"summary"/);
  assert.match(system, /"questions"/);
  assert.match(system, /"customerExplanation"/);
});

test("prompt omits the damage-notes line when absent", () => {
  const { input } = buildIntakeHelperPrompt({
    deviceModel: "iPhone 12",
    laneLabel: "نرم‌افزار",
    issueInitial: "کند شده",
    customerDamageNotes: null,
  });
  assert.doesNotMatch(input, /Pre-existing damage/);
});

test("parses strict JSON into three sections", () => {
  const r = parseIntakeHelperResult(
    '{"summary":"خلاصه","questions":["سوال ۱","سوال ۲"],"customerExplanation":"توضیح"}'
  );
  assert.ok(r);
  assert.equal(r!.summary, "خلاصه");
  assert.deepEqual(r!.questions, ["سوال ۱", "سوال ۲"]);
  assert.equal(r!.customerExplanation, "توضیح");
});

test("parses JSON wrapped in a ```json fence with surrounding prose", () => {
  const r = parseIntakeHelperResult(
    'اینجا پاسخ:\n```json\n{"summary":"s","questions":[],"customerExplanation":"c"}\n```\nپایان'
  );
  assert.ok(r);
  assert.equal(r!.summary, "s");
  assert.deepEqual(r!.questions, []);
});

test("drops non-string / empty questions defensively", () => {
  const r = parseIntakeHelperResult('{"summary":"s","questions":["ok", 5, "", "  "],"customerExplanation":""}');
  assert.ok(r);
  assert.deepEqual(r!.questions, ["ok"]);
});

test("keeps a non-JSON provider reply as a fallback summary", () => {
  assert.deepEqual(parseIntakeHelperResult("پیشنهاد اولیه برای بررسی بیشتر"), {
    summary: "پیشنهاد اولیه برای بررسی بیشتر",
    questions: [],
    customerExplanation: "",
  });
});

test("returns null for empty / whitespace / broken JSON", () => {
  assert.equal(parseIntakeHelperResult(""), null);
  assert.equal(parseIntakeHelperResult(null), null);
  assert.equal(parseIntakeHelperResult("{ not valid json ")?.summary, "{ not valid json");
  assert.equal(parseIntakeHelperResult('{"summary":"","questions":[],"customerExplanation":""}'), null);
});

test("disclaimer clearly frames output as a suggestion, not a diagnosis", () => {
  assert.match(INTAKE_HELPER_DISCLAIMER, /پیشنهاد/);
  assert.match(INTAKE_HELPER_DISCLAIMER, /تشخیص قطعی/);
});
