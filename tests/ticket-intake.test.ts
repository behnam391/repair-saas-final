import assert from "node:assert/strict";
import test from "node:test";
import { CreateTicketSchema } from "../lib/ticket-intake-schema";

const partnerMobileIntake = {
  customerName: "",
  customerPhone: "",
  deviceModel: "Samsung A54",
  deviceCategory: "MOBILE",
  deviceType: "",
  deviceBrand: "Samsung",
  operatingSystem: "",
  accessories: "",
  imei: "",
  issueInitial: "تعویض سوکت شارژ",
  lane: "HARDWARE",
  intakeSource: "PARTNER",
  partnerName: "موبایل همکار",
  partnerPhone: "09123456789",
};

test("partner mobile intake accepts the empty computer-only device type", () => {
  const parsed = CreateTicketSchema.parse(partnerMobileIntake);

  assert.equal(parsed.deviceType, undefined);
  assert.equal(parsed.partnerPhone, "09123456789");
  assert.equal(parsed.intakeSource, "PARTNER");
});

test("ticket intake returns a useful validation reason for an empty issue", () => {
  const parsed = CreateTicketSchema.safeParse({ ...partnerMobileIntake, issueInitial: "" });

  assert.equal(parsed.success, false);
  if (!parsed.success) assert.equal(parsed.error.errors[0]?.message, "شرح ایراد دستگاه را وارد کنید");
});
