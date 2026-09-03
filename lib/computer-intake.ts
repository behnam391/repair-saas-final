export const COMPUTER_DEVICE_TYPES = [
  { key: "LAPTOP", label: "لپ‌تاپ", hint: "نوت‌بوک و مک‌بوک" },
  { key: "DESKTOP", label: "کامپیوتر رومیزی", hint: "کیس اسمبل یا برند" },
  { key: "ALL_IN_ONE", label: "آل این وان", hint: "نمایشگر و کیس یکپارچه" },
  { key: "MINI_PC", label: "مینی پی‌سی", hint: "کامپیوترهای کوچک" },
  { key: "OTHER", label: "سایر", hint: "سرور و تجهیزات مشابه" },
] as const;

export const COMPUTER_BRANDS = [
  "Apple", "ASUS", "Acer", "Dell", "HP", "Lenovo", "MSI", "Microsoft",
  "Samsung", "Huawei", "Gigabyte", "Razer", "Alienware", "Toshiba",
  "Fujitsu", "Sony VAIO", "Framework", "اسمبل / بدون برند", "سایر",
];

export const COMPUTER_OS_OPTIONS = [
  "Windows 11", "Windows 10", "Windows 8 / 8.1", "Windows 7",
  "macOS", "Linux", "ChromeOS", "بدون سیستم‌عامل", "نامشخص",
];

export const COMPUTER_ACCESSORIES = [
  { key: "CHARGER", label: "شارژر" },
  { key: "POWER_CABLE", label: "کابل برق" },
  { key: "BAG", label: "کیف" },
  { key: "MOUSE", label: "ماوس" },
  { key: "BATTERY", label: "باتری جداشدنی" },
  { key: "ADAPTER", label: "مبدل/دانگل" },
] as const;

export const COMPUTER_QUICK_ISSUES = [
  { label: "روشن نمی‌شود", lane: "HARDWARE" },
  { label: "تصویر ندارد", lane: "HARDWARE" },
  { label: "کندی و هنگ", lane: "SOFTWARE" },
  { label: "نصب ویندوز یا نرم‌افزار", lane: "SOFTWARE" },
  { label: "داغی یا خاموشی", lane: "HARDWARE" },
  { label: "مشکل شارژ یا باتری", lane: "HARDWARE" },
  { label: "ارتقای RAM یا SSD", lane: "HARDWARE" },
  { label: "بازیابی اطلاعات", lane: "SOFTWARE" },
] as const;

export const COMPUTER_LANE_LABELS: Record<string, string> = {
  HARDWARE: "سخت‌افزار و قطعات",
  SOFTWARE: "ویندوز و نرم‌افزار",
  BOARD: "برد و تعمیر تخصصی",
};

export function computerDeviceTypeLabel(value?: string | null) {
  return COMPUTER_DEVICE_TYPES.find((item) => item.key === value)?.label ?? "کامپیوتر";
}

export function computerAccessoryLabels(value?: string | null) {
  const keys = (value || "").split(",").filter(Boolean);
  return COMPUTER_ACCESSORIES.filter((item) => keys.includes(item.key)).map((item) => item.label);
}
