import test from "node:test";
import assert from "node:assert/strict";
import { parseShopServices, serializeShopServices, shopHome } from "../lib/shop-services";
import { industryIntakeNotes } from "../lib/industry-intake";
import { CreateTicketSchema } from "../lib/ticket-intake-schema";
test("legacy accounts retain their dashboard and category defaults", () => {
  assert.deepEqual(parseShopServices(null), ["MOBILE"]);
  assert.equal(shopHome("MOBILE,COMPUTER"), "/tickets");
  assert.equal(shopHome("COMPUTER,FACILITIES"), "/tickets");
});
test("new industries serialize without silently becoming mobile", () => {
  assert.equal(serializeShopServices(["FACILITIES", "FACILITIES", "bogus"]), "FACILITIES");
  assert.equal(shopHome("FACILITIES"), "/industry-workspaces/facilities");
  assert.equal(shopHome("FACILITIES,VEHICLE"), "/industry-workspaces");
  assert.deepEqual(parseShopServices("unknown"), []);
});
test("specialized intake requires relevant details only", () => {
  assert.throws(() => industryIntakeNotes("facilities", {}), /آدرس/);
  assert.throws(() => industryIntakeNotes("vehicles", { plate: "123" }), /کارکرد/);
  const notes = industryIntakeNotes("facilities", { address: "آدرس نمونه", visit: "شنبه", injected: "ignored" });
  assert.match(notes, /شنبه/);
  assert.ok(!notes.includes("ignored"));
});
test("intake schema accepts new categories and retains legacy blank optional fields", () => {
  const fields = { deviceModel: "مدل", issueInitial: "ایراد", lane: "HARDWARE", deviceType: "" };
  assert.equal(CreateTicketSchema.parse(fields).deviceCategory, "MOBILE");
  assert.equal(CreateTicketSchema.parse({ ...fields, deviceCategory: "APPLIANCE" }).deviceCategory, "APPLIANCE");
  assert.equal(CreateTicketSchema.safeParse({ ...fields, deviceCategory: "UNKNOWN" }).success, false);
  assert.equal(CreateTicketSchema.safeParse({ ...fields, industryDetails: { address: "a".repeat(501) } }).success, false);
});
