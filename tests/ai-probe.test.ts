import test from "node:test";
import assert from "node:assert/strict";
import { probeAiConnection } from "../lib/ai/probe";

function setEnv(env: Record<string, string | undefined>) {
  for (const k of ["AI_ENABLED", "AI_PROVIDER", "AI_MODEL", "AI_BASE_URL", "AI_API_KEY", "AI_TIMEOUT_MS", "AI_SHOP_DAILY_LIMIT"]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

test("probe succeeds against the mock provider and reports provider/model/latency", async () => {
  setEnv({ AI_PROVIDER: "mock", AI_MODEL: "probe-model" });
  const r = await probeAiConnection();
  assert.equal(r.ok, true);
  assert.equal(r.provider, "mock");
  assert.equal(r.model, "probe-model");
  assert.equal(typeof r.latencyMs, "number");
  assert.equal(r.error, undefined);
});

test("probe runs even when AI is globally disabled (validate before enabling)", async () => {
  // AI_ENABLED not set (off) but a provider IS selected → probe still tests it.
  setEnv({ AI_PROVIDER: "mock", AI_MODEL: "m" });
  const r = await probeAiConnection();
  assert.equal(r.ok, true);
});

test("probe reports a safe failure when no provider is selected", async () => {
  setEnv({ AI_PROVIDER: "disabled" });
  const r = await probeAiConnection();
  assert.equal(r.ok, false);
  assert.equal(r.error?.kind, "disabled");
  assert.ok(r.error?.message && r.error.message.length > 0);
});

test("probe reports invalid_config for openai-compat without a base URL", async () => {
  setEnv({ AI_PROVIDER: "openai-compat", AI_MODEL: "gpt", AI_TIMEOUT_MS: "500" });
  const r = await probeAiConnection();
  assert.equal(r.ok, false);
  assert.equal(r.error?.kind, "invalid_config");
  // never leaks internals — just a safe message
  assert.doesNotMatch(r.error?.message ?? "", /http|fetch|stack/i);
});
