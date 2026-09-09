import test from "node:test";
import assert from "node:assert/strict";
import { INDUSTRY_WORKSPACES, isIndustryKey } from "../lib/industry-workspaces";
test("new industry dashboards cannot map to the legacy mobile/computer categories", () => {
  const categories = Object.values(INDUSTRY_WORKSPACES).map(i=>i.category);
  assert.equal(new Set(categories).size, 4);
  assert.ok(categories.every(c=>!['MOBILE','COMPUTER'].includes(c)));
});
test("industry routing accepts only explicitly configured own keys", () => {
  assert.equal(isIndustryKey('appliances'),true);
  for (const key of ['mobile','unknown','__proto__','constructor','toString']) assert.equal(isIndustryKey(key),false);
});
