// ── SubscriptionService: the single entitlement mutation point ──
// Every entitlement change (web, mock, and future stores) flows through here.
// It consumes a normalized VerifiedPurchase, computes the new entitlement with
// the pure deriveEntitlement, and asks the SubscriptionStore to apply it
// atomically + idempotently. Business logic is store-agnostic; persistence is
// behind the port. Adding a new payment source never changes this file.

import { getPricing, type Pricing, type PlanKey } from "@/lib/plans";
import { deriveEntitlement } from "./entitlement";
import type {
  ActivationResult,
  PurchaseRecordData,
  RestoreResult,
  SubscriptionStore,
  VerifiedPurchase,
} from "./types";

export class SubscriptionService {
  constructor(
    private readonly store: SubscriptionStore,
    // Injectable so tests don't touch the DB; production defaults to getPricing.
    private readonly pricingProvider: () => Promise<Pricing> = getPricing
  ) {}

  /**
   * Activate (or renew — same idempotent path) entitlement from a verified
   * purchase. Idempotent on purchase.externalRef: a repeated purchase returns
   * "already_active" and never extends entitlement twice.
   */
  async activate(purchase: VerifiedPurchase): Promise<ActivationResult> {
    const pricing = await this.pricingProvider();
    const outcome = await this.store.activate(purchase, (current) =>
      deriveEntitlement(current, purchase, pricing)
    );
    return {
      status: outcome.status,
      plan: purchase.plan as PlanKey,
      months: purchase.months,
      expiresAt: outcome.record.expiresAt,
      record: outcome.record,
    };
  }

  /**
   * Renewal is an activation with a new externalRef; it extends from the
   * current expiry. Separate name for clarity/logging; identical guarantees.
   */
  async renew(purchase: VerifiedPurchase): Promise<ActivationResult> {
    return this.activate(purchase);
  }

  /**
   * Restore a set of owned purchases (e.g. after reinstall). Each is activated
   * idempotently, so re-running is safe and never double-grants.
   */
  async restore(purchases: VerifiedPurchase[]): Promise<RestoreResult> {
    const results: ActivationResult[] = [];
    let activated = 0;
    let alreadyActive = 0;
    for (const p of purchases) {
      const r = await this.activate(p);
      results.push(r);
      if (r.status === "activated") activated++;
      else alreadyActive++;
    }
    return { activated, alreadyActive, results };
  }

  /**
   * Cancel stops auto-renewal and marks the purchase record CANCELLED. It does
   * NOT revoke entitlement — access runs until planExpiresAt (grace), then
   * lapses naturally because no further activation occurs.
   */
  async cancel(externalRef: string): Promise<PurchaseRecordData | null> {
    return this.store.cancel(externalRef);
  }

  findPurchase(externalRef: string): Promise<PurchaseRecordData | null> {
    return this.store.findPurchase(externalRef);
  }
}
