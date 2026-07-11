// Thin wrapper around Kavenegar's REST API (https://kavenegar.com).
// Swap this file's internals if you prefer ملی‌پیامک or another provider —
// every call site in this app only depends on the `sendSms` signature below.

import { db } from "./db";

async function getCredentials() {
  // Platform settings edited from /superadmin/settings win over env vars,
  // so keys can be rotated without a redeploy. Falls back to env if the
  // settings row doesn't exist yet or a field is empty.
  try {
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    return {
      apiKey: settings?.kavenegarApiKey || process.env.KAVENEGAR_API_KEY || "",
      sender: settings?.kavenegarSender || process.env.KAVENEGAR_SENDER || "10004346",
    };
  } catch {
    return { apiKey: process.env.KAVENEGAR_API_KEY || "", sender: process.env.KAVENEGAR_SENDER || "10004346" };
  }
}

export async function sendSms(to: string, message: string, sender?: string) {
  const { apiKey, sender: defaultSender } = await getCredentials();
  if (!apiKey) {
    console.warn("[sms] no Kavenegar API key configured — skipping real send:", { to, message });
    return { ok: false, skipped: true };
  }

  const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
  const params = new URLSearchParams({
    receptor: to,
    sender: sender || defaultSender,
    message,
  });

  const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kavenegar send failed: ${res.status} ${body}`);
  }
  return { ok: true, raw: await res.json() };
}

// Pre-built message for the most important automated notification: the
// device is ready for pickup. Includes the estimated/final price and the
// shop's own phone number (for the customer to call back), when available.
export function readyForPickupMessage(
  shopName: string,
  customerName: string,
  ticketNo: number,
  opts?: { price?: number | null; shopPhone?: string | null; includeCard?: boolean; cardNumber?: string | null }
) {
  let msg = `${shopName}\nسلام ${customerName} عزیز، دستگاه شما (کد پیگیری #${ticketNo}) آماده تحویل است.`;
  if (opts?.price) msg += `\nمبلغ قابل پرداخت: ${opts.price.toLocaleString("fa-IR")} تومان`;
  if (opts?.includeCard && opts?.cardNumber) msg += `\nشماره کارت: ${opts.cardNumber}`;
  if (opts?.shopPhone) msg += `\nتماس با تعمیرگاه: ${opts.shopPhone}`;
  return msg;
}
