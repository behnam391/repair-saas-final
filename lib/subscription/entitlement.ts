// ── Pure entitlement derivation ────────────────────────────────
// Given the shop's CURRENT entitlement and a verified purchase, compute the new
// entitlement. Pure and deterministic (aside from extendPlanExpiry's use of
// "now"), so it is fully unit-testable and identical for every payment source.
// Reuses the existing plan math — no new pricing/quota logic.

import { extendPlanExpiry, type Pricing, type PlanKey } from "@/lib/plans";
import type { AppliedEntitlement, CurrentEntitlement, VerifiedPurchase } from "./types";

export function deriveEntitlement(
  current: CurrentEntitlement | null,
  purchase: VerifiedPurchase,
  pricing: Pricing
): AppliedEntitlement {
  const plan = purchase.plan as PlanKey;
  // Extend from the current expiry when it is still in the future, else from
  // now — exactly the behavior of the existing web callback.
  const planExpiresAt = extendPlanExpiry(current?.planExpiresAt ?? null, purchase.months);
  const monthlyQuota = pricing.plans[plan].monthlyQuota;
  return { plan, planExpiresAt, monthlyQuota };
}
