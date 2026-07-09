import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayment } from "@/lib/zarinpal";
import { PLANS, type PlanKey } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET /api/billing/callback?subId=...&Authority=...&Status=OK|NOK
// Zarinpal redirects the user's browser here after payment. This route
// has no session requirement (the user is mid-redirect from the gateway),
// so it trusts only the subId + Zarinpal's own verify response — never
// the Status query param alone, which is not authoritative.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const subId = searchParams.get("subId");
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");

  const origin = req.nextUrl.origin;
  if (!subId || !authority) {
    return NextResponse.redirect(`${origin}/admin/billing?result=error`);
  }

  const sub = await db.subscription.findUnique({ where: { id: subId } });
  if (!sub || sub.authority !== authority) {
    return NextResponse.redirect(`${origin}/admin/billing?result=error`);
  }

  if (status !== "OK") {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "FAILED" } });
    return NextResponse.redirect(`${origin}/admin/billing?result=cancelled`);
  }

  const planInfo = PLANS[sub.plan as PlanKey];
  const verified = await verifyPayment({ amountToman: planInfo.priceToman, authority });

  if (!verified.ok) {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "FAILED" } });
    return NextResponse.redirect(`${origin}/admin/billing?result=failed`);
  }

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: "PAID", refId: verified.refId },
    });

    const shop = await tx.shop.findUniqueOrThrow({ where: { id: sub.shopId } });
    const now = new Date();
    // Extend from current expiry if still active, otherwise from now.
    const base = shop.planExpiresAt && shop.planExpiresAt > now ? shop.planExpiresAt : now;
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + 30);

    await tx.shop.update({
      where: { id: shop.id },
      data: { plan: sub.plan, planExpiresAt: newExpiry, monthlyQuota: planInfo.monthlyQuota },
    });
  });

  return NextResponse.redirect(`${origin}/admin/billing?result=success`);
}
