// Multi-gateway payment layer. Every checkout/callback route goes through
// here instead of talking to a specific gateway, so the platform can switch
// between Zarinpal, Zibal, and NextPay from /superadmin/settings without a
// code change. Whichever gateway a payment STARTED on is stored on the
// record (Subscription.paymentProvider / Invoice.paymentProvider) so its
// callback is always verified against the same gateway, even if the active
// provider is switched afterwards.
//
// All three gateways price in Rial, so every amount is toman × 10.
// Verified endpoints/codes:
//   Zarinpal — request/verify code 100 (101 already verified). (see lib/zarinpal.ts)
//   Zibal    — request result 100; verify result 100 (201 already verified); token = trackId; ref = refNumber.
//   NextPay  — token code -1 (success); verify code 0 (success); token = trans_id; ref = Shaparak_Ref_Id.

import { db } from "./db";
import { requestPayment as zpRequest, verifyPayment as zpVerify } from "./zarinpal";

export type ProviderKey = "zarinpal" | "zibal" | "nextpay";

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  zarinpal: "زرین‌پال",
  zibal: "زیبال",
  nextpay: "نکست‌پی",
};

async function getConfig() {
  let s: any = null;
  try {
    s = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    /* settings row may not exist yet */
  }
  const provider = ((s?.paymentProvider || process.env.PAYMENT_PROVIDER || "zarinpal") as ProviderKey);
  return {
    provider: (["zarinpal", "zibal", "nextpay"].includes(provider) ? provider : "zarinpal") as ProviderKey,
    zibalMerchant: s?.zibalMerchant || process.env.ZIBAL_MERCHANT || "",
    nextpayApiKey: s?.nextpayApiKey || process.env.NEXTPAY_API_KEY || "",
  };
}

export async function getActiveProvider(): Promise<ProviderKey> {
  return (await getConfig()).provider;
}

// Start a payment on the currently-active gateway. `orderId` is our own
// record id (subId / invoiceId) — required by Zibal/NextPay and handy as a
// cross-check.
export async function requestPayment(opts: {
  amountToman: number;
  description: string;
  callbackUrl: string;
  orderId: string;
}): Promise<{ provider: ProviderKey; token: string; payUrl: string }> {
  const { provider, zibalMerchant, nextpayApiKey } = await getConfig();
  const rial = opts.amountToman * 10;

  if (provider === "zibal") {
    // "zibal" is Zibal's built-in test merchant — works without registration.
    const merchant = zibalMerchant || "zibal";
    const res = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant,
        amount: rial,
        callbackUrl: opts.callbackUrl,
        description: opts.description,
        orderId: opts.orderId,
      }),
    });
    const data = await res.json();
    if (data?.result !== 100 || !data?.trackId) {
      throw new Error("Zibal request failed: " + JSON.stringify(data));
    }
    const trackId = String(data.trackId);
    return { provider, token: trackId, payUrl: `https://gateway.zibal.ir/start/${trackId}` };
  }

  if (provider === "nextpay") {
    if (!nextpayApiKey) throw new Error("NextPay api_key not configured");
    const res = await fetch("https://nextpay.org/nx/gateway/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: nextpayApiKey,
        amount: rial,
        order_id: opts.orderId,
        callback_uri: opts.callbackUrl,
      }),
    });
    const data = await res.json();
    // NextPay signals a successfully-created token with code -1.
    if (data?.code !== -1 || !data?.trans_id) {
      throw new Error("NextPay token failed: " + JSON.stringify(data));
    }
    const transId = String(data.trans_id);
    return { provider, token: transId, payUrl: `https://nextpay.org/nx/gateway/payment/${transId}` };
  }

  // Default: Zarinpal (reuses the existing, tested wrapper + sandbox fallback).
  const { authority, payUrl } = await zpRequest({
    amountToman: opts.amountToman,
    description: opts.description,
    callbackUrl: opts.callbackUrl,
  });
  return { provider: "zarinpal", token: authority, payUrl };
}

// Pull the gateway's transaction token + a provisional success flag out of
// the callback query/body. The authoritative result always comes from
// verifyPayment(), never from this flag alone.
export function parseCallback(provider: ProviderKey, params: URLSearchParams): { token: string | null; success: boolean } {
  if (provider === "zibal") {
    return { token: params.get("trackId"), success: params.get("success") === "1" };
  }
  if (provider === "nextpay") {
    // NextPay returns trans_id (+ order_id); the real yes/no is decided by verify.
    return { token: params.get("trans_id"), success: !!params.get("trans_id") };
  }
  // zarinpal
  return { token: params.get("Authority"), success: params.get("Status") === "OK" };
}

export async function verifyPayment(opts: {
  provider: ProviderKey;
  amountToman: number;
  token: string;
}): Promise<{ ok: boolean; refId?: string }> {
  const { zibalMerchant, nextpayApiKey } = await getConfig();
  const rial = opts.amountToman * 10;

  if (opts.provider === "zibal") {
    const merchant = zibalMerchant || "zibal";
    const res = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, trackId: opts.token }),
    });
    const data = await res.json();
    const ok = data?.result === 100 || data?.result === 201; // 201 = already verified
    return { ok, refId: data?.refNumber ? String(data.refNumber) : undefined };
  }

  if (opts.provider === "nextpay") {
    const res = await fetch("https://nextpay.org/nx/gateway/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: nextpayApiKey, trans_id: opts.token, amount: rial }),
    });
    const data = await res.json();
    const ok = data?.code === 0; // 0 = paid & verified
    return { ok, refId: data?.Shaparak_Ref_Id ? String(data.Shaparak_Ref_Id) : undefined };
  }

  const v = await zpVerify({ amountToman: opts.amountToman, authority: opts.token });
  return { ok: v.ok, refId: v.refId };
}

// Callbacks may arrive as GET (Zarinpal/Zibal) or POST (NextPay). Merge the
// query string with any posted form/JSON body so parseCallback sees every
// field regardless of method. Our own subId/invoiceId always rides in the
// query string of the callback URL, so it survives either way.
export async function collectCallbackParams(req: Request): Promise<URLSearchParams> {
  const url = new URL(req.url);
  const params = new URLSearchParams(url.searchParams);
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j: any = await req.json().catch(() => ({}));
        for (const k of Object.keys(j || {})) params.set(k, String(j[k]));
      } else {
        const form = await req.formData();
        for (const [k, v] of form.entries()) if (typeof v === "string") params.set(k, v);
      }
    } catch {
      /* no/%unparseable body — query string alone is fine */
    }
  }
  return params;
}
