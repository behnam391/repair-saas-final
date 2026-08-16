// ── WebPaymentProvider (existing web gateway as a first-class source) ──
// Wraps the EXISTING multi-gateway verification (lib/payments) and normalizes a
// verified web payment into a VerifiedPurchase. plan/months/amount come from the
// server-created Subscription row (never the client). This is the backward-
// compatible bridge that lets the web flow use the same SubscriptionService as
// every other source. No gateway logic is duplicated or changed here.

import { verifyPayment, type ProviderKey } from "@/lib/payments";
import type { PlanKey } from "@/lib/plans";
import type { PaymentProvider, VerificationResult } from "../types";

export interface WebVerifyInput {
  shopId: string;
  subId: string; // the Subscription row id — basis of the idempotency key
  token: string; // gateway transaction token (already matched to the stored authority)
  gateway: ProviderKey; // "zarinpal" | "zibal" | "nextpay"
  amountToman: number;
  plan: PlanKey;
  months: number;
}

export class WebPaymentProvider implements PaymentProvider<WebVerifyInput> {
  readonly key = "web";

  async verify(input: WebVerifyInput): Promise<VerificationResult> {
    const v = await verifyPayment({ provider: input.gateway, amountToman: input.amountToman, token: input.token });
    if (!v.ok) return { ok: false, reason: "gateway_unverified" };
    return {
      ok: true,
      purchase: {
        shopId: input.shopId,
        source: this.key,
        externalRef: `web:${input.subId}`,
        plan: input.plan,
        months: input.months,
        amountToman: input.amountToman,
        autoRenewing: false,
        purchasedAt: new Date(),
        providerRef: v.refId,
        raw: { subId: input.subId, gateway: input.gateway, refId: v.refId },
      },
    };
  }
}
