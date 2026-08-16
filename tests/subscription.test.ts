import test from "node:test";
import assert from "node:assert/strict";
import { SubscriptionService } from "../lib/subscription/service";
import { MockPaymentProvider } from "../lib/subscription/providers/mock";
import type {
  ActivationOutcome,
  DeriveEntitlement,
  PurchaseRecordData,
  SubscriptionStore,
  VerifiedPurchase,
} from "../lib/subscription/types";
import type { Pricing } from "../lib/plans";

// In-memory SubscriptionStore implementing the port — lets us test the whole
// lifecycle + idempotency deterministically with NO database.
class MemoryStore implements SubscriptionStore {
  shops = new Map<string, { plan: string; planExpiresAt: Date | null; monthlyQuota: number }>();
  records = new Map<string, PurchaseRecordData>();
  seedShop(id: string, e?: { plan?: string; planExpiresAt?: Date | null; monthlyQuota?: number }) {
    this.shops.set(id, { plan: e?.plan ?? "free", planExpiresAt: e?.planExpiresAt ?? null, monthlyQuota: e?.monthlyQuota ?? 10 });
  }
  async activate(p: VerifiedPurchase, derive: DeriveEntitlement): Promise<ActivationOutcome> {
    const seen = this.records.get(p.externalRef);
    if (seen) return { status: "already_active", record: seen };
    const cur = this.shops.get(p.shopId) ?? { plan: "free", planExpiresAt: null, monthlyQuota: 10 };
    const applied = derive({ plan: cur.plan, planExpiresAt: cur.planExpiresAt });
    this.shops.set(p.shopId, { plan: applied.plan, planExpiresAt: applied.planExpiresAt, monthlyQuota: applied.monthlyQuota });
    const rec: PurchaseRecordData = {
      id: "rec_" + p.externalRef, shopId: p.shopId, source: p.source, externalRef: p.externalRef,
      plan: p.plan, months: p.months, amountToman: p.amountToman ?? null, status: "ACTIVE",
      autoRenewing: p.autoRenewing ?? false, purchasedAt: p.purchasedAt ?? new Date(),
      expiresAt: applied.planExpiresAt, raw: null, createdAt: new Date(),
    };
    this.records.set(p.externalRef, rec);
    return { status: "activated", record: rec };
  }
  async cancel(ref: string): Promise<PurchaseRecordData | null> {
    const r = this.records.get(ref);
    if (!r) return null;
    r.status = "CANCELLED"; r.autoRenewing = false;
    return r;
  }
  async findPurchase(ref: string): Promise<PurchaseRecordData | null> {
    return this.records.get(ref) ?? null;
  }
}

// Minimal fake pricing so the service never touches getPricing()/the DB.
const FAKE_PRICING: Pricing = {
  plans: {
    free: { label: "free", priceToman: 0, monthlyQuota: 10 },
    pro: { label: "pro", priceToman: 490000, monthlyQuota: 200 },
    business: { label: "business", priceToman: 990000, monthlyQuota: 100000 },
  },
  durations: {
    1: { months: 1, label: "1", discountPct: 0 },
    3: { months: 3, label: "3", discountPct: 5 },
    6: { months: 6, label: "6", discountPct: 10 },
    12: { months: 12, label: "12", discountPct: 20 },
  },
};

function makeService(store: MemoryStore) {
  return new SubscriptionService(store, async () => FAKE_PRICING);
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

test("mock purchase activates entitlement and writes a record", async () => {
  const store = new MemoryStore();
  store.seedShop("shop1");
  const svc = makeService(store);
  const provider = new MockPaymentProvider();
  const v = await provider.verify({ shopId: "shop1", externalRef: "mock:1", plan: "pro", months: 1 });
  assert.equal(v.ok, true);
  const r = await svc.activate((v as any).purchase);
  assert.equal(r.status, "activated");
  assert.equal(store.shops.get("shop1")!.plan, "pro");
  assert.equal(store.shops.get("shop1")!.monthlyQuota, 200);
  assert.ok(store.shops.get("shop1")!.planExpiresAt! > new Date());
});

test("idempotency: the same externalRef never activates twice", async () => {
  const store = new MemoryStore();
  store.seedShop("shop1");
  const svc = makeService(store);
  const purchase: VerifiedPurchase = { shopId: "shop1", source: "mock", externalRef: "same-token", plan: "pro", months: 1 };
  const first = await svc.activate(purchase);
  const expiry1 = store.shops.get("shop1")!.planExpiresAt!;
  const second = await svc.activate(purchase); // duplicate
  const expiry2 = store.shops.get("shop1")!.planExpiresAt!;
  assert.equal(first.status, "activated");
  assert.equal(second.status, "already_active");
  assert.equal(expiry1.getTime(), expiry2.getTime()); // NOT extended a second time
});

test("renewal with a new externalRef extends from the current expiry", async () => {
  const store = new MemoryStore();
  store.seedShop("shop1");
  const svc = makeService(store);
  await svc.activate({ shopId: "shop1", source: "mock", externalRef: "p1", plan: "pro", months: 1 });
  const afterFirst = store.shops.get("shop1")!.planExpiresAt!.getTime();
  await svc.renew({ shopId: "shop1", source: "mock", externalRef: "p2", plan: "pro", months: 1 });
  const afterRenew = store.shops.get("shop1")!.planExpiresAt!.getTime();
  // extended by ~1 month (allow generous tolerance for month-length variance)
  assert.ok(afterRenew - afterFirst > 27 * 24 * 60 * 60 * 1000);
});

test("restore activates each purchase once; duplicates are no-ops", async () => {
  const store = new MemoryStore();
  store.seedShop("shop1");
  const svc = makeService(store);
  const summary = await svc.restore([
    { shopId: "shop1", source: "mock", externalRef: "a", plan: "pro", months: 1 },
    { shopId: "shop1", source: "mock", externalRef: "a", plan: "pro", months: 1 }, // dup
    { shopId: "shop1", source: "mock", externalRef: "b", plan: "business", months: 1 },
  ]);
  assert.equal(summary.activated, 2);
  assert.equal(summary.alreadyActive, 1);
});

test("cancel marks the record cancelled but does NOT revoke entitlement", async () => {
  const store = new MemoryStore();
  store.seedShop("shop1");
  const svc = makeService(store);
  await svc.activate({ shopId: "shop1", source: "mock", externalRef: "c1", plan: "pro", months: 1, autoRenewing: true });
  const expiryBefore = store.shops.get("shop1")!.planExpiresAt!.getTime();
  const rec = await svc.cancel("c1");
  assert.equal(rec?.status, "CANCELLED");
  assert.equal(rec?.autoRenewing, false);
  // entitlement untouched — grace until expiry
  assert.equal(store.shops.get("shop1")!.planExpiresAt!.getTime(), expiryBefore);
  assert.equal(store.shops.get("shop1")!.plan, "pro");
});

test("business plan applies the business quota (derived, not client-supplied)", async () => {
  const store = new MemoryStore();
  store.seedShop("shop1");
  const svc = makeService(store);
  await svc.activate({ shopId: "shop1", source: "mock", externalRef: "biz", plan: "business", months: 12 });
  assert.equal(store.shops.get("shop1")!.monthlyQuota, 100000);
  const expiry = store.shops.get("shop1")!.planExpiresAt!.getTime();
  assert.ok(expiry - Date.now() > 11 * MONTH_MS); // ~12 months out
});

test("mock provider rejects an unknown SKU (server-derived plan, not client)", async () => {
  const provider = new MockPaymentProvider();
  const bad = await provider.verify({ shopId: "shop1", externalRef: "x", sku: "not-a-real-sku" });
  assert.equal(bad.ok, false);
  const good = await provider.verify({ shopId: "shop1", externalRef: "y", sku: "peyvo.pro.12m" });
  assert.equal(good.ok, true);
  assert.equal((good as any).purchase.plan, "pro");
  assert.equal((good as any).purchase.months, 12);
});
