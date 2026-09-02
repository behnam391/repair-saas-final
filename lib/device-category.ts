export const DEVICE_CATEGORIES = ["MOBILE", "COMPUTER"] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const DEVICE_CATEGORY_LABEL: Record<DeviceCategory, string> = {
  MOBILE: "موبایل",
  COMPUTER: "کامپیوتر",
};

export function parseServiceCategories(value?: string | null): DeviceCategory[] {
  const parsed = (value || "MOBILE")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is DeviceCategory => DEVICE_CATEGORIES.includes(item as DeviceCategory));
  return parsed.length ? Array.from(new Set(parsed)) : ["MOBILE"];
}

export function serializeServiceCategories(values: readonly string[]): string {
  const valid = DEVICE_CATEGORIES.filter((item) => values.includes(item));
  return (valid.length ? valid : ["MOBILE"]).join(",");
}
