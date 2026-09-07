import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { sendCodeSms, sendIntakeSms, sendReadySms } from "../lib/sms";

test("repair notifications use mix while login codes retain Lookup", async () => {
  const original = db.platformSettings.findUnique;
  const originalFetch = globalThis.fetch;
  const prior = process.env.KAVENEGAR_REPAIR_MIX;
  const priorSender = process.env.KAVENEGAR_REPAIR_SENDER;
  const requests: URL[] = [];
  try {
    process.env.KAVENEGAR_REPAIR_MIX = "true";
    delete process.env.KAVENEGAR_REPAIR_SENDER;
    db.platformSettings.findUnique = (async () => ({ kavenegarApiKey: "test-key", smsUseLookup: true, kavenegarOtpTemplate: "otp", kavenegarIntakeTemplate: "intake", kavenegarReadyTemplate: "ready" })) as any;
    globalThis.fetch = (async (url: any) => {
      requests.push(new URL(String(url)));
      return new Response(JSON.stringify({ return: { status: 200 } }), { status: 200 });
    }) as typeof fetch;
    await sendIntakeSms("09000000000", { shopName: "Test", ticketNo: 1, fallback: "Intake" });
    await sendReadySms("09000000000", { shopName: "Test", ticketNo: 1, fallback: "Ready" });
    await sendCodeSms("09000000000", "12345", "Code");
    for (const url of requests.slice(0, 2)) {
      assert.equal(url.searchParams.get("policy"), "mix");
      assert.equal(url.searchParams.get("sender"), "100009361");
      assert.ok(url.pathname.endsWith("/sms/send.json"));
    }
    assert.ok(requests[2].pathname.endsWith("/verify/lookup.json"));
    assert.equal(requests[2].searchParams.get("policy"), null);
    process.env.KAVENEGAR_REPAIR_MIX = "false";
    await sendIntakeSms("09000000000", { shopName: "Test", ticketNo: 1, fallback: "Intake" });
    assert.equal(requests[3].searchParams.get("template"), "intake");
  } finally {
    db.platformSettings.findUnique = original;
    globalThis.fetch = originalFetch;
    if (prior === undefined) delete process.env.KAVENEGAR_REPAIR_MIX; else process.env.KAVENEGAR_REPAIR_MIX = prior;
    if (priorSender === undefined) delete process.env.KAVENEGAR_REPAIR_SENDER; else process.env.KAVENEGAR_REPAIR_SENDER = priorSender;
  }
});
