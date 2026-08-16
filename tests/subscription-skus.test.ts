import test from "node:test";
import assert from "node:assert/strict";
import { resolveSku, listSkus } from "../lib/subscription/skus";

test("known SKUs resolve to the correct plan/months", () => {
  assert.deepEqual(resolveSku("peyvo.pro.1m"), { plan: "pro", months: 1 });
  assert.deepEqual(resolveSku("peyvo.business.12m"), { plan: "business", months: 12 });
});

test("unknown SKU resolves to null (purchase must be rejected)", () => {
  assert.equal(resolveSku("peyvo.free.forever"), null);
  assert.equal(resolveSku(""), null);
});

test("catalog lists all configured SKUs", () => {
  const skus = listSkus();
  assert.ok(skus.includes("peyvo.pro.1m"));
  assert.ok(skus.includes("peyvo.business.12m"));
  assert.equal(skus.length, 8);
});
