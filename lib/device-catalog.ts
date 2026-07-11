// Baseline phone brand/model catalog shared across all shops. A shop can
// star brands as "favorite" (FavoriteBrand table) for quick access, and
// add anything missing (CustomDeviceModel table) — those additions merge
// with this static list in the UI, so the catalog effectively grows over
// time without a code change.

export const DEVICE_BRANDS: Record<string, string[]> = {
  "Samsung": ["Galaxy S24", "Galaxy S23", "Galaxy S22", "Galaxy A54", "Galaxy A34", "Galaxy A14", "Galaxy A04", "Galaxy Note 20", "Galaxy Z Flip5", "Galaxy Z Fold5"],
  "Apple": ["iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone 11", "iPhone XR", "iPhone SE"],
  "Xiaomi": ["Redmi Note 13", "Redmi Note 12", "Redmi Note 11", "Redmi 12", "Redmi 10", "Poco X6", "Poco M5", "Mi 11"],
  "Huawei": ["P50", "P40", "Mate 40", "Nova 11", "Nova 9", "Y9"],
  "Honor": ["Honor 90", "Honor 70", "Honor X9", "Honor X8"],
  "Oppo": ["Reno 10", "Reno 8", "A98", "A78", "A58"],
  "Vivo": ["V29", "V27", "Y36", "Y17"],
  "Realme": ["Realme 11", "Realme 10", "Realme C55", "Realme GT"],
  "OnePlus": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3"],
  "Nokia": ["Nokia G42", "Nokia C32", "Nokia 105"],
  "Sony": ["Xperia 1 V", "Xperia 10 V"],
  "LG": ["LG G8", "LG V60", "LG Velvet"],
  "Motorola": ["Moto G84", "Moto G54", "Moto Edge 40"],
  "Google": ["Pixel 8", "Pixel 7", "Pixel 6a"],
  "Asus": ["ROG Phone 8", "Zenfone 10"],
};

export const BRAND_NAMES = Object.keys(DEVICE_BRANDS);
