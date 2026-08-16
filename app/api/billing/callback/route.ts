import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseCallback, collectCallbackParams, type ProviderKey } from "@/lib/payments";
import { type PlanKey } from "@/lib/plans";
import { WebPaymentProvider, getSubscriptionService } from "@/lib/subscription";
import { logCaught } from "@/lib/logError";
import { getPublicOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

// /api/billing/callback?subId=...  (+ gateway params)
// The active gateway redirects the user's browser here after payment. No
// session requirement (mid-redirect from the gateway), so it trusts only the
// subId + the stored token + the gateway's own verify response — never the
// callback's success flag alone. Handles GET (Zarinpal/Zibal) and POST
// (NextPay).
//
// Entitlement is applied through the single SubscriptionService (via
// WebPaymentProvider), so the web gateway now shares one activation path with
// every other payment source. Behavior is unchanged: same verification, same
// plan-expiry math, same redirects. Idempotency is guaranteed by the
// PurchaseRecord's unique externalRef ("web:<subId>"), and already-PAID
// subscriptions short-circuit so a replayed callback never re-activates.
async function handle(req: NextRequest) {
  const origin = getPublicOrigin(req.nextUrl.origin);
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

    // Already processed (legacy row or a prior callback) — never re-activate.
    if (sub.status === "PAID") {
      return NextResponse.redirect(`${origin}/admin/billing?result=success`, 303);
    }

    // Verify through the web payment provider (wraps the existing gateway
    // verify) → normalized VerifiedPurchase.
    const web = new WebPaymentProvider();
    const result = await web.verify({
      shopId: sub.shopId,
      subId: sub.id,
      token,
      gateway: provider,
      amountToman: sub.amount,
      plan: sub.plan as PlanKey,
      months: sub.months,
    });

    if (!result.ok) {
      await db.subscription.update({ where: { id: sub.id }, data: { status: "FAILED" } });
      return NextResponse.redirect(`${origin}/admin/billing?result=failed`, 303);
    }

    // Single entitlement mutation point — idempotent on externalRef.
    await getSubscriptionService().activate(result.purchase);

    // Mark the web ledger row PAID (entitlement idempotency lives on the
    // PurchaseRecord, so this is just the Subscription row's status).
    await db.subscription.updateMany({
      where: { id: sub.id, status: { not: "PAID" } },
      data: { status: "PAID", refId: result.purchase.providerRef ?? null },
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
