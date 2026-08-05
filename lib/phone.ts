// One canonical form for every phone number that is used as a login key or a
// unique lookup key.
//
// WHY THIS FILE EXISTS
// --------------------
// Iranian keyboards type Persian digits (۰۹۱۲…), and phones cheerfully paste a
// leading space, a ZWNJ (U+200C) or an RTL mark (U+200F) into a plain text
// input. None of that is visible on screen — but `where: { phone }` is an
// EXACT string match, so `۰۹۱۲۳۴۵۶۷۸۹` simply does not find the row stored as
// `09123456789`. The person is then told "شماره موبایل یا رمز عبور اشتباه است",
// which points at the password and sends them chasing the wrong problem. It is
// the single most confusing failure mode in the app.
//
// The only cure is to funnel every phone through one function on BOTH sides of
// the wire: the client normalizes so the field visibly shows what will be sent,
// and the server normalizes again so a stale client, a mobile app, or a direct
// API call can never write a non-canonical row.

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

/**
 * Persian/Arabic digits → Latin, then drop every non-digit: spaces, dashes,
 * parentheses, dots, the leading `+`, ZWNJ, and the invisible bidi marks.
 *
 *   "۰۹۱۲-۳۴۵ ۶۷۸۹" → "09123456789"
 */
export function toLatinDigits(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/[^0-9]/g, "");
}

/**
 * Canonical Iranian mobile number — always `09XXXXXXXXX`.
 *
 *   "۰۹۱۲۳۴۵۶۷۸۹"     → "09123456789"
 *   "  0912 345 6789" → "09123456789"
 *   "+98 912 3456789" → "09123456789"
 *   "00989123456789"  → "09123456789"
 *   "9123456789"      → "09123456789"   (typed without the leading zero)
 *
 * Anything that is not recognisably an Iranian mobile is returned as plain
 * Latin digits and otherwise left alone, so landlines and foreign numbers
 * round-trip instead of being mangled into something that matches nothing.
 */
export function normalizePhone(input: string | null | undefined): string {
  const d = toLatinDigits(input);
  if (/^00989\d{9}$/.test(d)) return "0" + d.slice(4); // 0098 9xx xxx xxxx
  if (/^989\d{9}$/.test(d)) return "0" + d.slice(2); //   +98 9xx xxx xxxx
  if (/^9\d{9}$/.test(d)) return "0" + d; //              9xx xxx xxxx
  return d;
}

/**
 * Drop-in first argument for `z.preprocess(...)`, so a Zod schema validates
 * the CANONICAL number rather than whatever the keyboard produced:
 *
 *   phone: z.preprocess(preprocessPhone, z.string().regex(/^09\d{9}$/))
 *
 * Kept here (and free of any zod import) so lib/phone.ts stays cheap to pull
 * into a client component.
 */
export const preprocessPhone = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? normalizePhone(String(v)) : (v as string);

/**
 * Same idea for a one-time code. An OTP arrives as Latin digits in the SMS but
 * is often retyped on a Farsi keyboard as ۱۲۳۴۵, which then never matches the
 * stored code — the person is told the code is wrong and asks for another one,
 * forever. Use with `z.preprocess(preprocessDigits, z.string().length(5))`.
 */
export const preprocessDigits = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? toLatinDigits(String(v)) : (v as string);

/** True for a well-formed Iranian mobile, AFTER normalization. */
export function isValidMobile(input: string | null | undefined): boolean {
  return /^09\d{9}$/.test(normalizePhone(input));
}

/**
 * For optional secondary numbers (landline, emergency contact) where we still
 * want Persian digits converted but must not impose the mobile `09` shape.
 * Returns undefined for an empty value so it can be spread straight into a
 * Prisma `data` object.
 */
export function normalizeOptionalPhone(input: string | null | undefined): string | undefined {
  const d = toLatinDigits(input);
  return d.length ? d : undefined;
}
