import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { UnauthorizedError } from "@/lib/tenant";
import { getPricing, priceForDuration, type DurationKey } from "@/lib/plans";
import { resolveSku } from "@/lib/subscription/skus";

export const dynamic = "force-dynamic";

const Schema = z.object({
  sku: z.string().min(1).max(160),
});

const VALID_DURATIONS = new Set<number>([1, 3, 6, 12]);

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireCapability("billing.write");
    const { sku } = Schema.parse(await req.json());
    const item = resolveSku(sku);
    if (!item || item.plan === "free" || !VALID_DURATIONS.has(item.months)) {
      return NextResponse.json({ error: "unknown_sku", message: "محصول انتخاب‌شده معتبر نیست." }, { status: 400 });
    }

    const pricing = await getPricing();
    const amount = priceForDuration(item.plan, item.months as DurationKey, pricing);
    // Myket returns this exact value from server verification. It binds the
    // verified store purchase to this shop-owned server intent.
    const payload = randomBytes(24).toString("hex");
    const intent = await db.subscription.create({
      data: {
        shopId,
        plan: item.plan,
        months: item.months,
        amount,
        status: "PENDING",
        paymentProvider: "myket",
        authority: payload,
      },
    });

    return NextResponse.json({ intentId: intent.id, sku, payload, amount });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    console.error("[myket] create intent failed", error);
    return NextResponse.json({ error: "internal_error", message: "ساخت درخواست خرید ناموفق بود." }, { status: 500 });
  }
}
