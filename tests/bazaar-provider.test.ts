import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { BazaarPaymentProvider } from "@/lib/subscription/providers/bazaar";

test("Bazaar provider verifies the signed receipt and derives entitlement from SKU", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keyBody = publicKey.export({ type: "spki", format: "pem" }).toString()
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, "");
  const originalJson = JSON.stringify({
    orderId: "order-1", packageName: "com.peyvo.app", productId: "peyvo.pro.1m",
    purchaseTime: Date.now(), purchaseState: 0, developerPayload: "secure-payload", purchaseToken: "purchase-token",
  });
  const signature = sign("RSA-SHA1", Buffer.from(originalJson), privateKey).toString("base64");
  const provider = new BazaarPaymentProvider({ loadConfig: async () => ({ packageName: "com.peyvo.app", publicKey: keyBody }) });

  const result = await provider.verify({
    shopId: "shop-1", sku: "peyvo.pro.1m", token: "purchase-token", expectedPayload: "secure-payload",
    originalJson, signature, amountToman: 490000, orderId: "order-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.purchase.plan, "pro");
    assert.equal(result.purchase.months, 1);
    assert.equal(result.purchase.source, "bazaar");
  }
});

test("Bazaar provider rejects a tampered receipt", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keyBody = publicKey.export({ type: "spki", format: "pem" }).toString()
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, "");
  const originalJson = JSON.stringify({ packageName: "com.peyvo.app", productId: "peyvo.pro.1m", purchaseState: 0, developerPayload: "p", purchaseToken: "t" });
  const signature = sign("RSA-SHA1", Buffer.from(originalJson), privateKey).toString("base64");
  const provider = new BazaarPaymentProvider({ loadConfig: async () => ({ packageName: "com.peyvo.app", publicKey: keyBody }) });
  const result = await provider.verify({ shopId: "s", sku: "peyvo.pro.1m", token: "t", expectedPayload: "p", originalJson: originalJson + " ", signature });
  assert.deepEqual(result, { ok: false, reason: "invalid_signature" });
});
