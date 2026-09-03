import assert from "node:assert/strict";
import test from "node:test";
import { COMPUTER_BRANDS, COMPUTER_DEVICE_TYPES, computerAccessoryLabels, computerDeviceTypeLabel } from "../lib/computer-intake";

test("computer intake exposes computer-specific device types and brands", () => {
  assert.ok(COMPUTER_DEVICE_TYPES.some((item) => item.key === "LAPTOP"));
  assert.ok(COMPUTER_DEVICE_TYPES.some((item) => item.key === "DESKTOP"));
  assert.ok(COMPUTER_BRANDS.includes("Lenovo"));
  assert.ok(COMPUTER_BRANDS.includes("اسمبل / بدون برند"));
});

test("computer labels are human-readable on receipts and exports", () => {
  assert.equal(computerDeviceTypeLabel("ALL_IN_ONE"), "آل این وان");
  assert.deepEqual(computerAccessoryLabels("CHARGER,BAG"), ["شارژر", "کیف"]);
  assert.deepEqual(computerAccessoryLabels("UNKNOWN"), []);
});
