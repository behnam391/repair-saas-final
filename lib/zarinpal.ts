// Minimal wrapper around Zarinpal's REST API (https://www.zarinpal.com/docs/paymentGateway/).
// Uses the sandbox endpoint automatically if no merchant ID is configured
// (via /superadmin/settings or the ZARINPAL_MERCHANT_ID env var), so local
// dev never accidentally hits the real gateway.

import { db } from "./db";

async function getMerchantId() {
  try {
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    return settings?.zarinpalMerchantId || process.env.ZARINPAL_MERCHANT_ID || "";
  } catch {
    return process.env.ZARINPAL_MERCHANT_ID || "";
  }
}

function urls(merchantId: string) {
  const isSandbox = !merchantId;
  return {
    base: isSandbox ? "https://sandbox.zarinpal.com/pg/v4/payment" : "https://api.zarinpal.com/pg/v4/payment",
    startPay: isSandbox ? "https://sandbox.zarinpal.com/pg/StartPay" : "https://www.zarinpal.com/pg/StartPay",
  };
}

export async function requestPayment(opts: {
  amountToman: number;
  description: string;
  callbackUrl: string;
}) {
  const merchantId = await getMerchantId();
  const { base, startPay } = urls(merchantId);

  const res = await fetch(`${base}/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: merchantId || "00000000-0000-0000-0000-000000000000",
      amount: opts.amountToman * 10, // Zarinpal wants Rial
      description: opts.description,
      callback_url: opts.callbackUrl,
    }),
  });
  const data = await res.json();
  if (data?.data?.code !== 100) {
    throw new Error("Zarinpal request failed: " + JSON.stringify(data?.errors ?? data));
  }
  const authority = data.data.authority as string;
  return { authority, payUrl: `${startPay}/${authority}` };
}

export async function verifyPayment(opts: { amountToman: number; authority: string }) {
  const merchantId = await getMerchantId();
  const { base } = urls(merchantId);

  const res = await fetch(`${base}/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: merchantId || "00000000-0000-0000-0000-000000000000",
      amount: opts.amountToman * 10,
      authority: opts.authority,
    }),
  });
  const data = await res.json();
  const ok = data?.data?.code === 100 || data?.data?.code === 101; // 101 = already verified
  return { ok, refId: data?.data?.ref_id as string | undefined, raw: data };
}
