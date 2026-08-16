// ── MockPaymentProvider (development & tests) ──────────────────
// A deterministic, offline payment source. It performs NO I/O and never
// contacts a real gateway or store. Given an input it returns a normalized
// VerifiedPurchase — resolving plan/months from the SKU catalog when a `sku` is
// supplied (proving the server derives entitlement, not the client) or from
// explicit plan/months otherwise. Set `fail: true` to simulate a rejected
// verification.

import { resolveSku } from "../skus";
import type { PaymentProvider, VerificationResult } from "../types";
import type { PlanKey } from "@/lib/plans";

export interface MockVerifyInput {
  shopId: string;
  externalRef: string;
  sku?: string; // when set, plan/months come from the SKU catalog
  plan?: PlanKey; // used only when sku is absent
  months?: number;
  amountToman?: number;
  autoRenewing?: boolean;
  fail?: boolean; // simulate a verification failure
}

export class MockPaymentProvider implements PaymentProvider<MockVerifyInput> {
  readonly key = "mock";

  async verify(input: MockVerifyInput): Promise<VerificationResult> {
    if (input.fail) return { ok: false, reason: "mock_failed" };

    let plan: PlanKey | undefined = input.plan;
    let months: number | undefined = input.months;
    if (input.sku) {
      const info = resolveSku(input.sku);
      if (!info) return { ok: false, reason: "unknown_sku" };
      plan = info.plan;
      months = info.months;
    }
    if (!plan || !months) return { ok: false, reason: "missing_plan" };

    return {
      ok: true,
      purchase: {
        shopId: input.shopId,
        source: this.key,
        externalRef: input.externalRef,
        plan,
        months,
        amountToman: input.amountToman,
        autoRenewing: input.autoRenewing ?? false,
        purchasedAt: new Date(),
        raw: { mock: true, sku: input.sku ?? null },
      },
    };
  }
}
