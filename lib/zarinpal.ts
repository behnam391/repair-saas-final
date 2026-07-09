// Minimal wrapper around Zarinpal's REST API (https://www.zarinpal.com/docs/paymentGateway/).
// Uses the sandbox endpoint automatically if ZARINPAL_MERCHANT_ID isn't set,
// so local dev never accidentally hits the real gateway.

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || "";
const IS_SANDBOX = !MERCHANT_ID;
const BASE = IS_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/v4/payment"
  : "https://api.zarinpal.com/pg/v4/payment";
const STARTPAY_BASE = IS_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/StartPay"
  : "https://www.zarinpal.com/pg/StartPay";

export async function requestPayment(opts: {
  amountToman: number;
  description: string;
  callbackUrl: string;
}) {
  const res = await fetch(`${BASE}/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID || "00000000-0000-0000-0000-000000000000",
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
  return { authority, payUrl: `${STARTPAY_BASE}/${authority}` };
}

export async function verifyPayment(opts: { amountToman: number; authority: string }) {
  const res = await fetch(`${BASE}/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID || "00000000-0000-0000-0000-000000000000",
      amount: opts.amountToman * 10,
      authority: opts.authority,
    }),
  });
  const data = await res.json();
  const ok = data?.data?.code === 100 || data?.data?.code === 101; // 101 = already verified
  return { ok, refId: data?.data?.ref_id as string | undefined, raw: data };
}
