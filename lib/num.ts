// Numeric-input helpers for Persian/Arabic keyboards.
//
// Android/iOS Farsi keyboards type Persian digits (۱۲۳) — a native
// `<input type="number">` silently REJECTS those characters, so the field
// looks dead ("I type numbers and nothing happens"). The fix across the app
// is: use type="text" inputMode="numeric" and parse through num(), which
// accepts Persian, Arabic-Indic, and Latin digits interchangeably.

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

/** "۱۲۳4٥" → "12345" (also keeps '.' for decimals, drops everything else). */
export function normalizeDigits(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/[^0-9.]/g, "");
}

/** Parse any-mixed-digit string to a number (0 when empty/invalid). */
export function num(input: string): number {
  const n = parseFloat(normalizeDigits(input));
  return isNaN(n) ? 0 : n;
}
