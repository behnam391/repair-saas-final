import { db } from "@/lib/db";

// ── Subscription plans & pricing ──────────────────────────────
// These consts are the DEFAULTS. Real prices/quotas/discounts can be
// overridden live from the super-admin panel (stored on PlatformSettings and
// merged in by getPricing() below), so nothing here needs a redeploy to
// reprice. Labels/structure always come from here.

export const PLANS = {
  free: { label: "رایگان", priceToman: 0, monthlyQuota: 10 },
  pro: { label: "حرفه‌ای", priceToman: 490000, monthlyQuota: 200 },
  business: { label: "تجاری", priceToman: 990000, monthlyQuota: 100000 }, // effectively unlimited
} as const;

export type PlanKey = keyof typeof PLANS;

// Longer commitments get a discount off the monthly rate — same idea as
// most SaaS annual-billing discounts.
export const DURATIONS = {
  1: { months: 1, label: "۱ ماهه", discountPct: 0 },
  3: { months: 3, label: "۳ ماهه", discountPct: 5 },
  6: { months: 6, label: "۶ ماهه", discountPct: 10 },
  12: { months: 12, label: "۱۲ ماهه", discountPct: 20 },
} as const;

export type DurationKey = keyof typeof DURATIONS;

// Effective (possibly admin-overridden) pricing — same shape as the defaults
// but plain objects so DB values can populate them.
export type EffectivePlans = Record<PlanKey, { label: string; priceToman: number; monthlyQuota: number }>;
export type EffectiveDurations = Record<DurationKey, { months: number; label: string; discountPct: number }>;
export type Pricing = { plans: EffectivePlans; durations: EffectiveDurations };

// Total price for a plan over a duration, after that duration's discount.
// Pass a Pricing object (from getPricing) to honor admin overrides; omit it to
// compute from the code defaults.
export function priceForDuration(plan: PlanKey, duration: DurationKey, pricing?: Pricing): number {
  const plans = pricing?.plans ?? PLANS;
  const durations = pricing?.durations ?? DURATIONS;
  const base = plans[plan].priceToman * durations[duration].months;
  const discount = durations[duration].discountPct;
  return Math.round((base * (100 - discount)) / 100);
}

// SERVER-ONLY. Reads PlatformSettings and overlays any admin price/quota/
// discount overrides on top of the code defaults. Never throws — falls back to
// the defaults on any error so checkout can't break just because settings are
// unreadable. Every price calculation should go through this.
export async function getPricing(): Promise<Pricing> {
  let s: any = null;
  try {
    s = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    // fall through to defaults
  }
  // Accept a stored value only when it's a non-negative number; otherwise the
  // field is unset (null) and we keep the code default. (0 is valid — e.g. a
  // 0% discount — so the guard is >= 0, not truthiness.)
  const n = (v: any, fallback: number) => (typeof v === "number" && v >= 0 ? v : fallback);
  return {
    plans: {
      free: { ...PLANS.free },
      pro: {
        label: PLANS.pro.label,
        priceToman: n(s?.proPriceToman, PLANS.pro.priceToman),
        monthlyQuota: n(s?.proQuota, PLANS.pro.monthlyQuota),
      },
      business: {
        label: PLANS.business.label,
        priceToman: n(s?.businessPriceToman, PLANS.business.priceToman),
        monthlyQuota: n(s?.businessQuota, PLANS.business.monthlyQuota),
      },
    },
    durations: {
      1: { ...DURATIONS[1] },
      3: { months: 3, label: DURATIONS[3].label, discountPct: n(s?.discount3, DURATIONS[3].discountPct) },
      6: { months: 6, label: DURATIONS[6].label, discountPct: n(s?.discount6, DURATIONS[6].discountPct) },
      12: { months: 12, label: DURATIONS[12].label, discountPct: n(s?.discount12, DURATIONS[12].discountPct) },
    },
  };
}
