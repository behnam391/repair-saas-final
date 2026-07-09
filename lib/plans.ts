export const PLANS = {
  free: { label: "رایگان", priceToman: 0, monthlyQuota: 10 },
  pro: { label: "حرفه‌ای", priceToman: 490000, monthlyQuota: 200 },
  business: { label: "تجاری", priceToman: 990000, monthlyQuota: 100000 }, // effectively unlimited
} as const;

export type PlanKey = keyof typeof PLANS;
