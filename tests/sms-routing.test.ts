import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { sendCodeSms, sendIntakeSms, sendReadySms, sendBaleOnly, sendBaleInvoiceImage } from "../lib/sms";

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
    globalThis.fetch = (async (url: any, init: any) => {
      const request = new URL(String(url));
      if (init?.body) request.search = String(init.body);
      requests.push(request);
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
    await sendBaleOnly("09000000000", "Offer");
    assert.equal(requests[4].searchParams.get("sender"), "@peyvo_bale_bot");
    assert.equal(requests[4].searchParams.get("policy"), null);
    globalThis.fetch = (async () => new Response(JSON.stringify({ return: { status: 403 } }), { status: 200 })) as typeof fetch;
    await assert.rejects(sendBaleOnly("09000000000", "Offer"));
    const mediaRequests: { url: string; body: any }[] = [];
    globalThis.fetch = (async (url: any, init: any) => {
      mediaRequests.push({ url: String(url), body: init.body });
      return new Response(JSON.stringify({ return: { status: 200 }, entries: String(url).includes("media/upload") ? { id: "media-test", status: 1, review: { status: 1 } } : [] }));
    }) as typeof fetch;
    await sendBaleInvoiceImage("09000000000", "Invoice", new Blob([new Uint8Array([255,216,255])], { type: "image/jpeg" }));
    assert.ok(mediaRequests[0].body instanceof FormData);
    assert.ok(mediaRequests[0].body.get("File"));
    assert.equal(mediaRequests[1].body.get("mediaid"), "media-test");
    assert.equal(mediaRequests[1].body.get("sender"), "@peyvo_bale_bot");
    assert.equal(mediaRequests[1].body.get("policy"), null);
    let uploadCalls = 0;
    globalThis.fetch = (async () => { uploadCalls++; return new Response(JSON.stringify({ return: { status: 200 }, entries: { id: "pending", status: 0 } })); }) as typeof fetch;
    await assert.rejects(sendBaleInvoiceImage("09000000000", "Invoice", new Blob(["image"])));
    assert.equal(uploadCalls, 1, "Do not send while media is processing");
  } finally {
    db.platformSettings.findUnique = original;
    globalThis.fetch = originalFetch;
    if (prior === undefined) delete process.env.KAVENEGAR_REPAIR_MIX; else process.env.KAVENEGAR_REPAIR_MIX = prior;
    if (priorSender === undefined) delete process.env.KAVENEGAR_REPAIR_SENDER; else process.env.KAVENEGAR_REPAIR_SENDER = priorSender;
  }
});
