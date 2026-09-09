/** Peyvo product groups informed by TVTO groups; not official standard titles/codes. */
export const INDUSTRY_WORKSPACES = {
  appliances: {
    title: "تعمیرات لوازم خانگی", category: "APPLIANCE", group: "برق و الکترونیک",
    description: "پیگیری تعمیر لوازم خانگی، تأیید مشتری و آماده‌بودن دستگاه‌ها",
    examples: ["لباسشویی", "ظرفشویی", "یخچال و فریزر", "لوازم خانگی کوچک"],
    focus: "دستگاه‌های منتظر تأیید", focusStatus: "AWAITING_APPROVAL", assetLabel: "دستگاه",
    intakeNeeds: "نوع دستگاه، برند، سریال، لوازم همراه و محل انجام تعمیر",
  },
  facilities: {
    title: "تأسیسات گرمایشی و سرمایشی", category: "FACILITIES", group: "تأسیسات",
    description: "نمای مستقل تعمیرات و خدمات تجهیزات گرمایشی و سرمایشی",
    examples: ["پکیج و آبگرمکن", "کولر گازی", "کولر آبی", "تجهیزات برودتی"],
    focus: "خدمات در حال انجام", focusStatus: "IN_PROGRESS", assetLabel: "تجهیز",
    intakeNeeds: "آدرس محل خدمت، نوع تجهیز، شرح خرابی و زمان مراجعه",
  },
  vehicles: {
    title: "خودرو و موتورسیکلت", category: "VEHICLE", group: "صنایع خودرو",
    description: "نمای اختصاصی پرونده‌های تعمیر خودرو، موتور و خدمات تخصصی",
    examples: ["خودرو", "موتورسیکلت", "برق خودرو", "خدمات تخصصی خودرو"],
    focus: "وسایل آماده تحویل", focusStatus: "READY", assetLabel: "وسیله نقلیه",
    intakeNeeds: "نوع وسیله، مدل، پلاک، کیلومتر و شرح سرویس یا تعمیر",
  },
  industrial: {
    title: "تجهیزات برقی و صنعتی", category: "INDUSTRIAL", group: "برق و مکانیک",
    description: "پیگیری تعمیر تجهیزات، تأیید کارفرما و وضعیت تحویل",
    examples: ["الکتروموتور", "ابزار برقی", "پمپ", "تجهیزات صنعتی"],
    focus: "پرونده‌های منتظر تأیید", focusStatus: "AWAITING_APPROVAL", assetLabel: "تجهیز صنعتی",
    intakeNeeds: "مشخصات فنی، شماره تجهیز، کارفرما، محل نصب و شرح عیب",
  },
} as const;
export type IndustryKey = keyof typeof INDUSTRY_WORKSPACES;
export function isIndustryKey(value: string): value is IndustryKey {
  return Object.prototype.hasOwnProperty.call(INDUSTRY_WORKSPACES, value);
}
export const INDUSTRY_STATUS_LABELS: Record<string, string> = {
  PENDING: "ثبت‌شده", IN_PROGRESS: "در حال انجام", AWAITING_APPROVAL: "منتظر تأیید",
  REFERRED: "ارجاع‌شده", READY: "آماده تحویل", DELIVERED: "تحویل‌شده", CANCELLED: "لغوشده",
};
