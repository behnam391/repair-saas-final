// Thin wrapper around Kavenegar's REST API (https://kavenegar.com).
// Swap this file's internals if you prefer ملی‌پیامک or another provider —
// every call site in this app only depends on the `sendSms` signature below.

const KAVENEGAR_API_KEY = process.env.KAVENEGAR_API_KEY!;
const DEFAULT_SENDER = process.env.KAVENEGAR_SENDER || "10004346";

export async function sendSms(to: string, message: string, sender?: string) {
  if (!KAVENEGAR_API_KEY) {
    console.warn("[sms] KAVENEGAR_API_KEY not set — skipping real send:", { to, message });
    return { ok: false, skipped: true };
  }

  const url = `https://api.kavenegar.com/v1/${KAVENEGAR_API_KEY}/sms/send.json`;
  const params = new URLSearchParams({
    receptor: to,
    sender: sender || DEFAULT_SENDER,
    message,
  });

  const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kavenegar send failed: ${res.status} ${body}`);
  }
  return { ok: true, raw: await res.json() };
}

// Pre-built message for the most important automated notification:
// the device is ready for pickup.
export function readyForPickupMessage(shopName: string, customerName: string, ticketNo: number) {
  return `${shopName}\nسلام ${customerName} عزیز، دستگاه شما (کد پیگیری #${ticketNo}) آماده تحویل است.`;
}
