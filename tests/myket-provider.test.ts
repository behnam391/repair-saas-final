import test from "node:test";
import assert from "node:assert/strict";
import { MyketPaymentProvider } from "../lib/subscription/providers/myket";

const CONFIG = {
  packageName: "com.peyvo.app",
  publicKey: "public-key",
  accessToken: "server-secret",
};

test("Myket provider verifies with server token and derives entitlement from SKU", async () => {
  let authHeader = "";
  let requestBody = "";
  const provider = new MyketPaymentProvider({
    loadConfig: async () => CONFIG,
    fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
      authHeader = new Headers(init?.headers).get("X-Access-Token") ?? "";
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({
        purchaseState: 0,
        purchaseTime: 1_750_000_000_000,
        developerPayload: "intent-payload",
        consumptionState: 0,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch,
  });

  const result = await provider.verify({
    shopId: "shop-1",
    sku: "peyvo.business.6m",
    token: "purchase-token",
    expectedPayload: "intent-payload",
    amountToman: 5_000_000,
    orderId: "order-1",
  });

  assert.equal(result.ok, true);
  assert.equal(authHeader, "server-secret");
  assert.deepEqual(JSON.parse(requestBody), { tokenId: "purchase-token" });
  if (!result.ok) return;
  assert.equal(result.purchase.plan, "business");
  assert.equal(result.purchase.months, 6);
  assert.match(result.purchase.externalRef, /^myket:[a-f0-9]{64}$/);
  assert.equal(result.purchase.raw && (result.purchase.raw as any).token, undefined);
});

test("Myket provider rejects a mismatched developer payload", async () => {
  const provider = new MyketPaymentProvider({
    loadConfig: async () => CONFIG,
    fetchImpl: (async () => new Response(JSON.stringify({
      purchaseState: 0,
      developerPayload: "another-intent",
    }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch,
  });

  const result = await provider.verify({
    shopId: "shop-1",
    sku: "peyvo.pro.1m",
    token: "purchase-token",
    expectedPayload: "expected-intent",
  });
  assert.deepEqual(result, { ok: false, reason: "developer_payload_mismatch" });
});

test("Myket provider never accepts an unknown client SKU", async () => {
  let called = false;
  const provider = new MyketPaymentProvider({
    loadConfig: async () => CONFIG,
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch,
  });
  const result = await provider.verify({
    shopId: "shop-1",
    sku: "peyvo.fake.99m",
    token: "token",
    expectedPayload: "payload",
  });
  assert.deepEqual(result, { ok: false, reason: "unknown_sku" });
  assert.equal(called, false);
});
