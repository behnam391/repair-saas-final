import test from "node:test";
import assert from "node:assert/strict";
import { isValidMobile, normalizePhone, toLatinDigits } from "../lib/phone";

test("normalizes Persian, Arabic and international mobile formats", () => {
  const expected = "09359998877";
  assert.equal(normalizePhone("\u06f0\u06f9\u06f3\u06f5\u06f9\u06f9\u06f9\u06f8\u06f8\u06f7\u06f7"), expected);
  assert.equal(normalizePhone("+98 935 999 8877"), expected);
  assert.equal(normalizePhone("0098-935-999-8877"), expected);
});

test("rejects malformed mobile numbers", () => {
  assert.equal(isValidMobile("02188776655"), false);
  assert.equal(isValidMobile("09359998877"), true);
});

test("normalizes OTP and card digits", () => {
  assert.equal(toLatinDigits("\u06f1\u06f2\u06f3\u06f4\u06f5"), "12345");
  assert.equal(toLatinDigits("\u06f6\u06f0\u06f3\u06f7-\u06f9\u06f9\u06f7\u06f5"), "60379975");
});
