// Thin wrapper around Kavenegar's REST API (https://kavenegar.com).
// Swap this file's internals if you prefer ملی‌پیامک or another provider —
// every call site in this app only depends on the `sendSms` signature below.

import { db } from "./db";
import { decryptSecret } from "./crypto";

async function getCredentials() {
  // Platform settings edited from /superadmin/settings win over env vars,
  // so keys can be rotated without a redeploy. Falls back to env if the
  // settings row doesn't exist yet or a field is empty. The API key is stored
  // encrypted at rest (lib/crypto.ts); decryptSecret passes legacy plaintext
  // through unchanged, so this is safe before and after the backfill.
  try {
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    return {
      apiKey: decryptSecret(settings?.kavenegarApiKey) || process.env.KAVENEGAR_API_KEY || "",
      sender: settings?.kavenegarSender || process.env.KAVENEGAR_SENDER || "10004346",
    };
  } catch {
    return { apiKey: process.env.KAVENEGAR_API_KEY || "", sender: process.env.KAVENEGAR_SENDER || "10004346" };
  }
}

/**
 * Whether real SMS sending is possible at all (a Kavenegar API key exists
 * either in platform settings or env). Used by the forgot-password flows
 * to tell the user honestly that no code can be delivered yet — checked
 * BEFORE any account lookup, so it never leaks which numbers exist.
 */
export async function isSmsConfigured() {
  const { apiKey } = await getCredentials();
  return !!apiKey;
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

// ── Kavenegar Lookup (OTP / سرویس اعتبارسنجی) ──────────────────
// Lookup sends only PRE-APPROVED templates and fills their %token slots. Its
// big advantage: it works on the free service line (no dedicated line to buy)
// and has high transactional delivery. Constraint: token / token2 / token3
// values MUST NOT contain spaces; only token10 allows spaces (used for the
// shop name). So numeric values (ticket no, price, phone) go in the first
// three, and the shop name goes in token10.

type LookupTokens = { token?: string; token2?: string; token3?: string; token10?: string; token20?: string };

async function getLookupConfig() {
  try {
    const s = (await db.platformSettings.findUnique({ where: { id: "singleton" } })) as any;
    return {
      enabled: !!s?.smsUseLookup,
      otp: s?.kavenegarOtpTemplate || "",
      intake: s?.kavenegarIntakeTemplate || "",
      ready: s?.kavenegarReadyTemplate || "",
    };
  } catch {
    return { enabled: false, otp: "", intake: "", ready: "" };
  }
}

const onlyDigits = (s?: string | null) => (s || "").replace(/[^\d]/g, "");
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export async function sendLookup(receptor: string, template: string, tokens: LookupTokens) {
  const { apiKey } = await getCredentials();
  if (!apiKey) {
    console.warn("[sms] no Kavenegar API key — skipping lookup:", { receptor, template });
    return { ok: false, skipped: true };
  }
  const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;
  const params = new URLSearchParams({ receptor, template });
  for (const [k, v] of Object.entries(tokens)) {
    if (v != null && v !== "") params.set(k, String(v));
  }
  const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kavenegar lookup failed: ${res.status} ${body}`);
  }
  return { ok: true, raw: await res.json() };
}

// High-level senders used by the app. Each uses Lookup when it's enabled AND a
// template name is configured; otherwise it falls back to the free-form text
// passed in `fallback`, so behavior is unchanged until Lookup is switched on.

export async function sendCodeSms(to: string, code: string, fallback: string) {
  const cfg = await getLookupConfig();
  if (cfg.enabled && cfg.otp) return sendLookup(to, cfg.otp, { token: code });
  return sendSms(to, fallback);
}

export async function sendIntakeSms(
  to: string,
  args: { shopName: string; ticketNo: number; shopPhone?: string | null; fallback: string }
) {
  const cfg = await getLookupConfig();
  if (cfg.enabled && cfg.intake) {
    return sendLookup(to, cfg.intake, {
      token: String(args.ticketNo),
      token2: onlyDigits(args.shopPhone) || "-",
      token10: clip(args.shopName, 25),
    });
  }
  return sendSms(to, args.fallback);
}

export async function sendReadySms(
  to: string,
  args: { shopName: string; ticketNo: number; price?: number | null; shopPhone?: string | null; fallback: string }
) {
  const cfg = await getLookupConfig();
  if (cfg.enabled && cfg.ready) {
    return sendLookup(to, cfg.ready, {
      token: String(args.ticketNo),
      token2: String(args.price ?? 0),
      token3: onlyDigits(args.shopPhone) || "-",
      token10: clip(args.shopName, 25),
    });
  }
  if (cfg.enabled && !cfg.ready) {
    throw new Error("Kavenegar ready Lookup template is not configured");
  }
  return sendSms(to, args.fallback);
}

// Sent the moment a device is accepted at intake — the professional
// "we've got your device" confirmation. Gives the customer their tracking
// number right away so they don't have to call to check.
export function intakeReceivedMessage(
  shopName: string,
  customerName: string,
  ticketNo: number,
  opts?: { deviceModel?: string | null; shopPhone?: string | null }
) {
  let msg = `${shopName}\nسلام ${customerName} عزیز، دستگاه شما${opts?.deviceModel ? ` (${opts.deviceModel})` : ""} با کد پیگیری #${ticketNo} پذیرش شد. به‌محض آماده‌شدن، با پیامک اطلاع می‌دهیم.`;
  if (opts?.shopPhone) msg += `\nتماس با تعمیرگاه: ${opts.shopPhone}`;
  return msg;
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
