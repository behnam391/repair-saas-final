import test from "node:test";
import assert from "node:assert/strict";
import { getDeviceLabel, getLoginRequestMetadata } from "../lib/login-sessions";

test("login metadata uses the first forwarded IP and strips control characters", () => {
  const result = getLoginRequestMetadata({
    headers: {
      "x-forwarded-for": "203.0.113.4, 10.0.0.2",
      "user-agent": "Peyvo\nBrowser",
    },
  });
  assert.equal(result.ipAddress, "203.0.113.4");
  assert.equal(result.userAgent, "Peyvo Browser");
});

test("device label recognizes the Peyvo Android application", () => {
  assert.equal(getDeviceLabel("Mozilla/5.0 Android PeyvoNativeApp"), "اپلیکیشن اندروید پیوو");
});

test("device label distinguishes common browser devices", () => {
  assert.equal(getDeviceLabel("Mozilla/5.0 (Windows NT 10.0) Chrome/128.0"), "ویندوز · Chrome");
  assert.equal(getDeviceLabel(null), "دستگاه نامشخص");
});
