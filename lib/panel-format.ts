import { formatJalaliDate } from "./jalali";
export type DisplayLocale = "fa" | "en" | "ar";
export function panelNumber(value: number, locale: DisplayLocale) {
  return value.toLocaleString(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-u-nu-arab" : "en-US");
}
export function panelDate(value: string, locale: DisplayLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  if (locale === "fa") return formatJalaliDate(value);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-arab" : "en-US", { year: "numeric", month: "short", day: "numeric", calendar: "gregory", timeZone: "Asia/Tehran" }).format(date);
}
