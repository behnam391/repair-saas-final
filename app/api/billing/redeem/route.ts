import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { PLANS, PlanKey } from "@/lib/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ code: z.string().min(3).max(40) });

// POST /api/billing/redeem — a shop owner redeems a gift code for a free
// subscription. Single-use, atomic: the code is only consumed if it's still
// unredeemed, and the plan is extended exactly like a paid subscription.
export async function POST(req: NextRequest) {
  try {
    const { shopId, role } = await requireSession();
    if (role !== "OWNER") {
      return NextResponse.json({ message: "فقط مدیر مغازه می‌تواند کد هدیه را ثبت کند" }, { status: 403 });
    }
    const { code } = Schema.parse(await req.json());
    const normalized = code.trim().toUpperCase();

    const result = await db.$transaction(async (tx) => {
      const gift = await tx.giftCode.findUnique({ where: { code: normalized } });
      if (!gift) return { error: "کد هدیه نامعتبر است" };
      if (gift.redeemedByShopId) return { error: "این کد قبلاً استفاده شده است" };

      const planInfo = PLANS[gift.plan as PlanKey];
      if (!planInfo) return { error: "پلن این کد نامعتبر است" };

      const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId } });
      const now = new Date();
      const base = shop.planExpiresAt && shop.planExpiresAt > now ? shop.planExpiresAt : now;
      const newExpiry = new Date(base);
      newExpiry.setMonth(newExpiry.getMonth() + gift.months);

      await tx.shop.update({
        where: { id: shopId },
        data: { plan: gift.plan, planExpiresAt: newExpiry, monthlyQuota: planInfo.monthlyQuota },
      });
      await tx.giftCode.update({
        where: { id: gift.id },
        data: { redeemedByShopId: shopId, redeemedAt: now },
      });
      return { ok: true, plan: gift.plan, months: gift.months, planExpiresAt: newExpiry };
    });

    if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
