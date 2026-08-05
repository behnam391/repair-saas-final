/**
 * Unit test for lib/phone.ts - the fix for "the site says my password is
 * wrong when the password is right".
 *
 * Run from the project root (Windows PowerShell or cmd both work):
 *
 *   npx tsc lib/phone.ts --outDir .phonetest --module es2020 --target es2020
 *   node scripts/test-phone.mjs
 *
 * The .phonetest folder is throwaway - delete it afterwards.
 * Exits non-zero if anything regresses.
 */
import { normalizePhone, toLatinDigits, isValidMobile, preprocessPhone, preprocessDigits } from "../.phonetest/phone.js";
import { z } from "zod";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  if (got === want) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`); }
};

const CANON = "09359998877";

console.log("\n==== 1. the exact failure the user hit ====\n");
// A Farsi keyboard types Persian digits. The row in the database is Latin.
eq("Persian digits normalize to the stored form", normalizePhone("۰۹۳۵۹۹۹۸۸۷۷"), CANON);
eq("Arabic-Indic digits too", normalizePhone("٠٩٣٥٩٩٩٨٨٧٧"), CANON);
eq("mixed Persian + Latin", normalizePhone("۰۹35۹۹۹۸۸۷۷"), CANON);
eq("already-Latin is untouched", normalizePhone(CANON), CANON);

console.log("\n==== 2. invisible characters that a paste brings along ====\n");
eq("trailing space", normalizePhone("09359998877 "), CANON);
eq("leading space", normalizePhone(" 09359998877"), CANON);
eq("newline from a copied cell", normalizePhone("09359998877\n"), CANON);
eq("non-breaking space", normalizePhone("09359998877 "), CANON);
eq("ZWNJ in the middle", normalizePhone("0935‌9998877"), CANON);
eq("RTL mark (invisible, very common in Persian text)", normalizePhone("‏09359998877"), CANON);
eq("LTR mark", normalizePhone("‎09359998877"), CANON);
eq("Arabic letter mark", normalizePhone("؜09359998877"), CANON);

console.log("\n==== 3. shapes people actually type ====\n");
eq("dashes", normalizePhone("0935-999-8877"), CANON);
eq("spaces as grouping", normalizePhone("0935 999 8877"), CANON);
eq("+98 international", normalizePhone("+98 935 999 8877"), CANON);
eq("0098 international", normalizePhone("00989359998877"), CANON);
eq("98 with no plus", normalizePhone("989359998877"), CANON);
eq("no leading zero", normalizePhone("9359998877"), CANON);
eq("parentheses", normalizePhone("(0935) 999-8877"), CANON);
eq("Persian +98", normalizePhone("+۹۸۹۳۵۹۹۹۸۸۷۷"), CANON);

console.log("\n==== 4. things it must NOT mangle ====\n");
eq("a Tehran landline keeps its digits", normalizePhone("021-88776655"), "02188776655");
eq("empty stays empty", normalizePhone(""), "");
eq("null is safe", normalizePhone(null), "");
eq("undefined is safe", normalizePhone(undefined), "");
eq("a short number is left alone, not padded", normalizePhone("123"), "123");
eq("a 10-digit number NOT starting with 9 is left alone", normalizePhone("2188776655"), "2188776655");
eq("normalizing twice changes nothing (idempotent)", normalizePhone(normalizePhone("۰۹۳۵-۹۹۹ ۸۸۷۷")), CANON);

console.log("\n==== 5. isValidMobile ====\n");
eq("Persian digits count as a valid mobile", isValidMobile("۰۹۳۵۹۹۹۸۸۷۷"), true);
eq("spaced number counts as valid", isValidMobile(" 0935 999 8877 "), true);
eq("a landline is not a mobile", isValidMobile("02188776655"), false);
eq("too short is not a mobile", isValidMobile("0935999887"), false);
eq("too long is not a mobile", isValidMobile("093599988771"), false);
eq("empty is not a mobile", isValidMobile(""), false);

console.log("\n==== 6. toLatinDigits (used for OTP codes and card numbers) ====\n");
eq("Persian OTP becomes matchable", toLatinDigits("۱۲۳۴۵"), "12345");
eq("OTP with a trailing space", toLatinDigits("12345 "), "12345");
eq("Persian card number", toLatinDigits("۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸"), "6037997512345678");

console.log("\n==== 7. the zod wiring the API routes actually use ====\n");
// Exactly the shapes now in app/api/**: required, optional, and the OTP.
const Required = z.object({ phone: z.preprocess(preprocessPhone, z.string().regex(/^09\d{9}$/)) });
const Optional = z.object({ phone: z.preprocess(preprocessPhone, z.string().min(5).optional()) });
const Otp = z.object({ code: z.preprocess(preprocessDigits, z.string().length(5)) });

eq("required: Persian digits now PASS validation",
  Required.parse({ phone: "۰۹۳۵۹۹۹۸۸۷۷" }).phone, CANON);
eq("required: garbage still fails",
  Required.safeParse({ phone: "hello" }).success, false);
eq("optional: absent stays undefined (Prisma then skips the column)",
  Optional.parse({}).phone, undefined);
eq("optional: present is normalized",
  Optional.parse({ phone: "۰۹۳۵۹۹۹۸۸۷۷" }).phone, CANON);
eq("optional: a number instead of a string is coerced, not crashed",
  Optional.parse({ phone: 9359998877 }).phone, CANON);
eq("otp: Persian code now matches the stored Latin code",
  Otp.parse({ code: "۱۲۳۴۵" }).code, "12345");
eq("otp: wrong length still fails",
  Otp.safeParse({ code: "۱۲۳" }).success, false);

console.log("\n" + "=".repeat(58));
console.log(`  ${pass} passed, ${fail} failed`);
console.log("  " + (fail === 0
  ? "The Persian-keyboard login failure is fixed at every entry point."
  : "REGRESSION - do not ship this."));
console.log("=".repeat(58) + "\n");
process.exit(fail === 0 ? 0 : 1);
