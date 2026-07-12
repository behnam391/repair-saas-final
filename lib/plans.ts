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

export function priceForDuration(plan: PlanKey, duration: DurationKey) {
  const base = PLANS[plan].priceToman * DURATIONS[duration].months;
  const discount = DURATIONS[duration].discountPct;
  return Math.round((base * (100 - discount)) / 100);
}
