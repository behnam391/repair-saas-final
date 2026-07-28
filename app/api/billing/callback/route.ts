import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayment, parseCallback, collectCallbackParams, type ProviderKey } from "@/lib/payments";
import { getPricing, type PlanKey } from "@/lib/plans";
import { logCaught } from "@/lib/logError";

export const dynamic = "force-dynamic";

// /api/billing/callback?subId=...  (+ gateway params)
// The active gateway redirects the user's browser here after payment. No
// session requirement (mid-redirect from the gateway), so it trusts only
// the subId + the stored token + the gateway's own verify response — never
// the callback's success flag alone. Handles GET (Zarinpal/Zibal) and POST
// (NextPay) alike.
async function handle(req: NextRequest) {
  const origin = req.nextUrl.origin;
  try {
    const params = await collectCallbackParams(req);
    const subId = params.get("subId") || req.nextUrl.searchParams.get("subId");

    if (!subId) return NextResponse.redirect(`${origin}/admin/billing?result=error`, 303);

    const sub = await db.subscription.findUnique({ where: { id: subId } });
    if (!sub) return NextResponse.redirect(`${origin}/admin/billing?result=error`, 303);

    const provider = (((sub as any).paymentProvider as ProviderKey) || "zarinpal");
    const { token, success } = parseCallback(provider, params);

    // The token echoed back by the gateway must match the one we stored at
    // checkout — guards against a tampered/mismatched callback.
    if (!token || sub.authority !== token) {
      return NextResponse.redirect(`${origin}/admin/billing?result=error`, 303);
    }

    if (!success) {
      await db.subscription.update({ where: { id: sub.id }, data: { status: "FAILED" } });
      return NextResponse.redirect(`${origin}/admin/billing?result=cancelled`, 303);
    }

    const pricing = await getPricing();
    const planInfo = pricing.plans[sub.plan as PlanKey];
    const verified = await verifyPayment({ provider, amountToman: sub.amount, token });

    if (!verified.ok) {
      await db.subscription.update({ where: { id: sub.id }, data: { status: "FAILED" } });
      return NextResponse.redirect(`${origin}/admin/billing?result=failed`, 303);
    }

    await db.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: sub.id }, data: { status: "PAID", refId: verified.refId } });

      const shop = await tx.shop.findUniqueOrThrow({ where: { id: sub.shopId } });
      const now = new Date();
      const base = shop.planExpiresAt && shop.planExpiresAt > now ? shop.planExpiresAt : now;
      const newExpiry = new Date(base);
      newExpiry.setMonth(newExpiry.getMonth() + sub.months);

      await tx.shop.update({
        where: { id: shop.id },
        data: { plan: sub.plan, planExpiresAt: newExpiry, monthlyQuota: planInfo.monthlyQuota },
      });
    });

    return NextResponse.redirect(`${origin}/admin/billing?result=success`, 303);
  } catch (e) {
    // A crash here can mean money left the customer but the plan wasn't
    // applied — the highest-value thing to capture in the خطاها panel.
    await logCaught(e, { source: "payment", path: "/api/billing/callback", method: req.method });
    return NextResponse.redirect(`${origin}/admin/billing?result=error`, 303);
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
