// ── Server-side SKU catalog ────────────────────────────────────
// Maps a store product id (SKU) to {plan, months}. This is Peyvo's OWN catalog
// (not a store API): store providers resolve the plan/months here rather than
// trusting any client-supplied plan — the anti-forgery guarantee. The SKU
// strings below are placeholders to be aligned with the products actually
// created in each store's developer console.

import type { PlanKey } from "@/lib/plans";

export interface SkuInfo {
  plan: PlanKey;
  months: number;
}

const SKU_CATALOG: Record<string, SkuInfo> = {
  "peyvo.pro.1m": { plan: "pro", months: 1 },
  "peyvo.pro.3m": { plan: "pro", months: 3 },
  "peyvo.pro.6m": { plan: "pro", months: 6 },
  "peyvo.pro.12m": { plan: "pro", months: 12 },
  "peyvo.business.1m": { plan: "business", months: 1 },
  "peyvo.business.3m": { plan: "business", months: 3 },
  "peyvo.business.6m": { plan: "business", months: 6 },
  "peyvo.business.12m": { plan: "business", months: 12 },
};

/** Resolve a SKU to its plan/months, or null if unknown (reject the purchase). */
export function resolveSku(sku: string): SkuInfo | null {
  return SKU_CATALOG[sku] ?? null;
}

export function listSkus(): string[] {
  return Object.keys(SKU_CATALOG);
}
