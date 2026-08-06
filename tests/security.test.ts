import test from "node:test";
import assert from "node:assert/strict";
import { generateOtp, hashOtp, strongPassword, verifyOtp } from "../lib/security";

test("OTP is five numeric digits", () => {
  for (let i = 0; i < 100; i++) assert.match(generateOtp(), /^\d{5}$/);
});

test("OTP hash is bound to both identifier and code", () => {
  const hash = hashOtp("09120000000", "12345");
  assert.equal(verifyOtp("09120000000", "12345", hash), true);
  assert.equal(verifyOtp("09120000000", "12346", hash), false);
  assert.equal(verifyOtp("09121111111", "12345", hash), false);
  assert.doesNotMatch(hash, /12345/);
});

test("password policy requires length, a letter and a number", () => {
  assert.equal(strongPassword.safeParse("147147147a").success, true);
  assert.equal(strongPassword.safeParse("12345678").success, false);
  assert.equal(strongPassword.safeParse("abcdefgh").success, false);
  assert.equal(strongPassword.safeParse("a1short").success, false);
});
