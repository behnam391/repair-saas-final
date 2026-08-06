import { db } from "./db";

type Result = { ok: boolean; retryAfterSec: number };
type BucketRow = { count: number; resetAt: Date };

// Atomic, database-backed limiter. All Vercel instances share the same
// buckets, so cold starts or horizontal scaling cannot reset the limits.
export async function rateLimit(key: string, max: number, windowMs: number): Promise<Result> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<BucketRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextReset}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset} ELSE "RateLimitBucket"."resetAt" END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;
  const bucket = rows[0];
  if (!bucket) return { ok: false, retryAfterSec: Math.ceil(windowMs / 1000) };
  return {
    ok: bucket.count <= max,
    retryAfterSec: bucket.count <= max ? 0 : Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function tooMany(retryAfterSec: number) {
  return { status: 429, message: `درخواست بیش از حد. لطفاً ${retryAfterSec} ثانیه دیگر دوباره تلاش کنید.` };
}
