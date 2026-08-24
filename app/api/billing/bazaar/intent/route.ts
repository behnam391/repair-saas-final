import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { UnauthorizedError } from "@/lib/tenant";
import { getPricing, priceForDuration, type DurationKey } from "@/lib/plans";
import { resolveSku } from "@/lib/subscription/skus";

export const dynamic = "force-dynamic";
const Schema = z.object({ sku: z.string().min(1).max(160) });
const VALID_DURATIONS = new Set<number>([1, 3, 6, 12]);

// Bazaar currently caps a single in-app product at 20,000,000 rial
// (2,000,000 toman). Keep the server-side intent amount identical to the
// price configured in Pishkhan so receipts/history never show a larger amount
// than the customer actually paid.
const BAZAAR_PRICE_TOMAN: Record<string, number> = {
  "peyvo.pro.1m": 490_000,
  "peyvo.pro.3m": 570_000,
  "peyvo.pro.6m": 1_080_000,
  "peyvo.pro.12m": 1_920_000,
  "peyvo.business.1m": 990_000,
  "peyvo.business.3m": 2_000_000,
  "peyvo.business.6m": 2_000_000,
  "peyvo.business.12m": 2_000_000,
};

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireCapability("billing.write");
    const { sku } = Schema.parse(await req.json());
    const item = resolveSku(sku);
    if (!item || item.plan === "free" || !VALID_DURATIONS.has(item.months)) {
      return NextResponse.json({ error: "unknown_sku", message: "محصول انتخاب‌شده معتبر نیست." }, { status: 400 });
    }
    const amount = BAZAAR_PRICE_TOMAN[sku]
      ?? priceForDuration(item.plan, item.months as DurationKey, await getPricing());
    const payload = randomBytes(24).toString("hex");
    const intent = await db.subscription.create({
      data: { shopId, plan: item.plan, months: item.months, amount, status: "PENDING", paymentProvider: "bazaar", authority: payload },
    });
    return NextResponse.json({ intentId: intent.id, sku, payload, amount });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error("[bazaar] create intent failed", error);
    return NextResponse.json({ error: "internal_error", message: "ساخت درخواست خرید ناموفق بود." }, { status: 500 });
  }
}
