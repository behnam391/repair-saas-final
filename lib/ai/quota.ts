// ── Per-shop AI usage guard (NOT billing) ──────────────────────
// A service-layer cap so a single shop can't exhaust the platform's provider
// budget. Built on the existing distributed limiter (RateLimitBucket), so it
// is consistent across all serverless instances. This is a guard, not
// metering/billing — no money, no invoices, no per-call accounting beyond the
// rolling window counter.

import { rateLimit } from "../ratelimit";
import type { AiConfig } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns { ok } for whether this shop may make one more AI call in the
 * current daily window. shopDailyLimit <= 0 disables the cap. Calling this
 * consumes one unit from the window (attempts count toward the budget).
 */
export async function checkShopQuota(shopId: string, config: AiConfig): Promise<{ ok: boolean; retryAfterSec: number }> {
  if (!config.shopDailyLimit || config.shopDailyLimit <= 0) {
    return { ok: true, retryAfterSec: 0 };
  }
  return rateLimit(`ai:shop:${shopId}`, config.shopDailyLimit, DAY_MS);
}
