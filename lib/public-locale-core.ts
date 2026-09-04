export const PUBLIC_LOCALES = ["fa", "en", "ar"] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export function getPublicLocale(value?: string | string[] | null): PublicLocale {
  const locale = Array.isArray(value) ? value[0] : value;
  return locale === "en" || locale === "ar" ? locale : "fa";
}

export function publicPath(locale: PublicLocale, path = ""): string {
  const normalized = path && path !== "/" ? (path.startsWith("/") ? path : `/${path}`) : "";
  return locale === "fa" ? normalized || "/" : `/${locale}${normalized}`;
}

export const PUBLIC_LANGUAGE_LABELS: Record<PublicLocale, string> = {
  fa: "فارسی",
  en: "English",
  ar: "العربية",
};
