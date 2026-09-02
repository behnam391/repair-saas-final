import assert from "node:assert/strict";
import test from "node:test";
import { parseServiceCategories, serializeServiceCategories } from "../lib/device-category";

test("old shops default to mobile intake", () => {
  assert.deepEqual(parseServiceCategories(null), ["MOBILE"]);
  assert.equal(serializeServiceCategories([]), "MOBILE");
});

test("mobile and computer services are normalized and de-duplicated", () => {
  assert.deepEqual(parseServiceCategories(" COMPUTER, MOBILE,COMPUTER "), ["COMPUTER", "MOBILE"]);
  assert.equal(serializeServiceCategories(["COMPUTER", "MOBILE", "COMPUTER"]), "MOBILE,COMPUTER");
});

test("unknown service values are ignored", () => {
  assert.deepEqual(parseServiceCategories("TV,COMPUTER"), ["COMPUTER"]);
  assert.equal(serializeServiceCategories(["TV", "COMPUTER"]), "COMPUTER");
});
