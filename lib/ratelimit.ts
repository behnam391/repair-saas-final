// Lightweight in-memory rate limiter.
//
// CAVEAT: state lives in a single serverless instance's memory, so on Vercel
// this is best-effort — a determined attacker spraying across many cold
// instances can partially evade it. It still cheaply stops casual abuse and
// accidental double-submits. For the specific "drain the SMS credit" vector,
// the send-code / forgot-password routes ALSO enforce a per-phone cooldown
// backed by the database (checkPhoneCooldown below), which IS robust across
// instances. For heavier protection later, swap the Map for Redis/Upstash.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count++;
  return { ok: true, retryAfterSec: 0 };
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Standard 429 response body.
export function tooMany(retryAfterSec: number) {
  return { status: 429, message: `درخواست بیش از حد. لطفاً ${retryAfterSec} ثانیه دیگر دوباره تلاش کنید.` };
}
