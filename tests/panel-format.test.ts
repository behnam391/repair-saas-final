import test from "node:test";
import assert from "node:assert/strict";
import { panelDate, panelNumber } from "../lib/panel-format";
test("panel amounts follow the selected language without converting currency", () => {
  assert.equal(panelNumber(1250000,"en"), "1,250,000");
  assert.match(panelNumber(1250000,"fa"), /۱/);
  assert.match(panelNumber(1250000,"ar"), /١/);
});
test("panel dates use Gregorian English and Arabic and reject invalid values", () => {
  assert.equal(panelDate("invalid","en"), "—");
  assert.match(panelDate("2026-09-08T12:00:00Z","en"), /2026/);
  assert.match(panelDate("2026-09-08T12:00:00Z","fa"), /۱۴۰۵/);
  assert.match(panelDate("2026-09-08T12:00:00Z","ar"), /٢٠٢٦/);
});
