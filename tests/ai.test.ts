import test from "node:test";
import assert from "node:assert/strict";
import { runCompletion, isAiEnabled, loadAiConfig } from "../lib/ai";
import { redactForPrompt } from "../lib/ai/redact";

// Every test sets the full AI_* env explicitly so there is no bleed between
// tests (loadAiConfig reads process.env live on each call).
function setEnv(env: Record<string, string | undefined>) {
  for (const k of [
    "AI_ENABLED", "AI_PROVIDER", "AI_FALLBACK_PROVIDER", "AI_MODEL",
    "AI_BASE_URL", "AI_API_KEY", "AI_TIMEOUT_MS", "AI_MAX_RETRIES",
    "AI_FALLBACK_MODEL", "AI_FALLBACK_BASE_URL", "AI_FALLBACK_API_KEY",
    "AI_MAX_TOKENS", "AI_TEMPERATURE", "AI_SHOP_DAILY_LIMIT",
  ]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

const baseReq = { shopId: "shop_test", task: "test.echo", system: "you are a test", input: "دستگاه روشن نمی‌شود" };

test("disabled by default — no env means AI is off and returns a safe result", async () => {
  setEnv({});
  assert.equal(await isAiEnabled(), false);
  const r = await runCompletion(baseReq);
  assert.equal(r.ok, false);
  assert.equal(r.provider, "none");
  assert.equal(r.error?.kind, "disabled");
});

test("AI_ENABLED without a provider stays disabled (no accidental calls)", async () => {
  setEnv({ AI_ENABLED: "true" }); // provider defaults to "disabled"
  assert.equal(await isAiEnabled(), false);
  const r = await runCompletion(baseReq);
  assert.equal(r.error?.kind, "disabled");
});

test("OpenAI token-only setup replaces legacy mock defaults", async () => {
  setEnv({ AI_ENABLED: "true", AI_PROVIDER: "openai-compat", AI_API_KEY: "sk-test-token", AI_MODEL: "mock-model" });
  const cfg = await loadAiConfig();
  assert.equal(cfg.baseUrl, "https://api.openai.com/v1");
  assert.equal(cfg.model, "gpt-5-mini");
  assert.equal(cfg.apiKey, "sk-test-token");
});

test("legacy mock selection cannot swallow a configured OpenAI token", async () => {
  setEnv({ AI_ENABLED: "true", AI_PROVIDER: "mock", AI_API_KEY: "sk-test-token", AI_MODEL: "gpt-5-mini" });
  const cfg = await loadAiConfig();
  assert.equal(cfg.provider, "openai-compat");
  assert.equal(cfg.baseUrl, "https://api.openai.com/v1");
});

test("Hetzner inference receives a production-safe minimum timeout", async () => {
  setEnv({
    AI_ENABLED: "true", AI_PROVIDER: "openai-compat", AI_API_KEY: "hetzner-token",
    AI_BASE_URL: "https://inference.hetzner.com/api/v1", AI_MODEL: "Qwen/Qwen3.6-35B-A3B-FP8",
    AI_TIMEOUT_MS: "20000",
  });
  const cfg = await loadAiConfig();
  assert.equal(cfg.timeoutMs, 75000);
});

test("legacy Hetzner endpoint and retired large models are repaired", async () => {
  setEnv({
    AI_ENABLED: "true", AI_PROVIDER: "openai-compat", AI_API_KEY: "hetzner-token",
    AI_BASE_URL: "https://inference.hetzner.com/v1", AI_MODEL: "deepseek-ai/deepseek-v3",
    AI_FALLBACK_PROVIDER: "openai-compat", AI_FALLBACK_BASE_URL: "https://inference.hetzner.com/v1",
    AI_FALLBACK_MODEL: "GLM-5.2",
  });
  const cfg = await loadAiConfig();
  assert.equal(cfg.baseUrl, "https://inference.hetzner.com/api/v1");
  assert.equal(cfg.model, "Qwen/Qwen3.6-35B-A3B-FP8");
  assert.equal(cfg.fallbackBaseUrl, "https://inference.hetzner.com/api/v1");
  assert.equal(cfg.fallbackModel, "Qwen3.8-27B");
});

test("mock provider returns a marked, ok result without echoing raw input", async () => {
  setEnv({ AI_ENABLED: "true", AI_PROVIDER: "mock", AI_MODEL: "m1", AI_SHOP_DAILY_LIMIT: "0" });
  const r = await runCompletion(baseReq);
  assert.equal(r.ok, true);
  assert.equal(r.provider, "mock");
  assert.match(r.text ?? "", /^\[mock:m1\]/);
  assert.doesNotMatch(r.text ?? "", /روشن/); // never echoes the raw input
  assert.ok((r.usage?.totalTokens ?? 0) > 0);
});

test("provider switching is config-only: primary fails → fallback answers", async () => {
  // openai-compat with no baseUrl fails fast with invalid_config; fallback=mock.
  setEnv({
    AI_ENABLED: "true", AI_PROVIDER: "openai-compat", AI_FALLBACK_PROVIDER: "mock",
    AI_MAX_RETRIES: "0", AI_SHOP_DAILY_LIMIT: "0",
  });
  const r = await runCompletion(baseReq);
  assert.equal(r.ok, true);
  assert.equal(r.provider, "mock"); // fell back without any code change
});

test("when all providers fail, result is a safe negative and never throws", async () => {
  setEnv({
    AI_ENABLED: "true", AI_PROVIDER: "openai-compat", AI_MAX_RETRIES: "0", AI_SHOP_DAILY_LIMIT: "0",
  });
  const r = await runCompletion(baseReq); // no baseUrl → invalid_config, no fallback
  assert.equal(r.ok, false);
  assert.equal(r.provider, "none");
  assert.equal(r.error?.kind, "invalid_config");
});

test("quota disabled (limit 0) never touches the quota store", async () => {
  setEnv({ AI_ENABLED: "true", AI_PROVIDER: "mock", AI_SHOP_DAILY_LIMIT: "0" });
  const cfg = await loadAiConfig();
  assert.equal(cfg.shopDailyLimit, 0);
  const r = await runCompletion(baseReq); // would throw if it hit the (absent) DB
  assert.equal(r.ok, true);
});

test("quota store unreachable fails OPEN (AI stays available)", async () => {
  // limit > 0 makes checkShopQuota call rateLimit → DB, which is absent here;
  // the service must catch and allow, not break.
  setEnv({ AI_ENABLED: "true", AI_PROVIDER: "mock", AI_SHOP_DAILY_LIMIT: "5" });
  const r = await runCompletion({ ...baseReq, shopId: `shop_quota_probe_${Date.now()}` });
  assert.equal(r.ok, true);
  assert.equal(r.provider, "mock");
});

test("redaction masks phone, email and IMEI before send", () => {
  const out = redactForPrompt("تماس 09121234567 ایمیل a@b.com imei 351756051523999");
  assert.doesNotMatch(out, /09121234567/);
  assert.doesNotMatch(out, /a@b\.com/);
  assert.doesNotMatch(out, /351756051523999/);
  assert.match(out, /\[phone\]/);
  assert.match(out, /\[email\]/);
  assert.match(out, /\[imei\]/);
});

test("runCompletion never throws even on a totally bogus provider config", async () => {
  setEnv({ AI_ENABLED: "true", AI_PROVIDER: "openai-compat", AI_BASE_URL: "http://127.0.0.1:1", AI_MAX_RETRIES: "0", AI_SHOP_DAILY_LIMIT: "0", AI_TIMEOUT_MS: "300" });
  const r = await runCompletion(baseReq); // connection refused → network error, caught
  assert.equal(r.ok, false);
  assert.equal(r.provider, "none");
});
