import { toJalaali, toGregorian } from "jalaali-js";

/**
 * Real Jalali/Shamsi calendar formatting.
 *
 * The codebase previously used `date.toLocaleDateString("fa-IR")`, which
 * only swaps in Persian digits and month names while still counting days on
 * the GREGORIAN calendar — so every displayed date was off by ~621 years
 * and landed on the wrong month/day entirely. These helpers do an actual
 * Gregorian → Jalali conversion (via jalaali-js) before formatting, so
 * dates shown in the app match the real Iranian calendar.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const JALALI_WEEKDAYS = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه",
];

function asDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** e.g. "۳۰ تیر ۱۴۰۵" */
export function formatJalaliDate(input: Date | string | number): string {
  const d = asDate(input);
  if (isNaN(d.getTime())) return "-";
  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
}

/** e.g. "۱۴۰۵/۰۴/۳۰" — compact numeric form for tables/CSV. */
export function formatJalaliDateNumeric(input: Date | string | number): string {
  const d = asDate(input);
  if (isNaN(d.getTime())) return "-";
  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toPersianDigits(`${jy}/${pad2(jm)}/${pad2(jd)}`);
}

/** e.g. "۱۴:۰۵" — plain clock time, calendar-independent, Persian digits. */
export function formatJalaliTime(input: Date | string | number): string {
  const d = asDate(input);
  if (isNaN(d.getTime())) return "-";
  return toPersianDigits(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
}

/** e.g. "۳۰ تیر ۱۴۰۵، ۱۴:۰۵" */
export function formatJalaliDateTime(input: Date | string | number): string {
  return `${formatJalaliDate(input)}، ${formatJalaliTime(input)}`;
}

/** e.g. "شنبه" — Jalali week starts Saturday; JS getDay() 0=Sunday. */
export function formatJalaliWeekday(input: Date | string | number): string {
  const d = asDate(input);
  if (isNaN(d.getTime())) return "-";
  return JALALI_WEEKDAYS[d.getDay()];
}

export function toPersianDigitsPublic(input: string | number): string {
  return toPersianDigits(input);
}

/** Gregorian Date → {jy, jm, jd} (jm is 1-indexed, matches jalaali-js). */
export function toJalaliYMD(input: Date | string | number): { jy: number; jm: number; jd: number } {
  const d = asDate(input);
  return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** First Gregorian instant (00:00) of a given Jalali year/month/day. */
export function jalaliToGregorianDate(jy: number, jm: number, jd = 1): Date {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

/** e.g. "تیر ۰۵" — short month + 2-digit year, for chart axis labels. */
export function jalaliMonthLabel(jy: number, jm: number): string {
  return toPersianDigits(`${JALALI_MONTHS[jm - 1]} ${jy % 100}`);
}

/**
 * Builds `count` consecutive Jalali month buckets ending at the current
 * Jalali month (oldest first) — e.g. for a "last 12 months" revenue chart.
 * Each bucket carries a `key` (`"jy-jm"`) for aggregation and a `label`.
 */
export function lastJalaliMonths(count: number, now: Date = new Date()) {
  const { jy, jm } = toJalaliYMD(now);
  const months: { key: string; jy: number; jm: number; label: string }[] = [];
  let y = jy, m = jm;
  for (let i = 0; i < count; i++) {
    months.unshift({ key: `${y}-${m}`, jy: y, jm: m, label: jalaliMonthLabel(y, m) });
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
  }
  return months;
}
