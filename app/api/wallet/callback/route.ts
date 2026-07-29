import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayment, parseCallback, collectCallbackParams, type ProviderKey } from "@/lib/payments";
import { logCaught } from "@/lib/logError";

export const dynamic = "force-dynamic";

// /api/wallet/callback?txnId=...  (+ gateway params)
// The gateway redirects here after a wallet top-up. Mirrors the billing
// callback: only the stored token + the gateway's own verify response are
// trusted, and the credit is applied atomically. Idempotent — a duplicate
// callback on an already-PAID row is a no-op. Handles GET (Zarinpal/Zibal) and
// POST (NextPay).
async function handle(req: NextRequest) {
  const origin = req.nextUrl.origin;
  try {
    const params = await collectCallbackParams(req);
    const txnId = params.get("txnId") || req.nextUrl.searchParams.get("txnId");
    if (!txnId) return NextResponse.redirect(`${origin}/admin/wallet?result=error`, 303);

    const txn = await (db as any).walletTransaction.findUnique({ where: { id: txnId } });
    if (!txn) return NextResponse.redirect(`${origin}/admin/wallet?result=error`, 303);
    if (txn.status === "PAID") return NextResponse.redirect(`${origin}/admin/wallet?result=success`, 303);

    const provider = ((txn.paymentProvider as ProviderKey) || "zarinpal");
    const { token, success } = parseCallback(provider, params);

    if (!token || txn.authority !== token) {
      return NextResponse.redirect(`${origin}/admin/wallet?result=error`, 303);
    }
    if (!success) {
      await (db as any).walletTransaction.update({ where: { id: txn.id }, data: { status: "FAILED" } });
      return NextResponse.redirect(`${origin}/admin/wallet?result=cancelled`, 303);
    }

    const verified = await verifyPayment({ provider, amountToman: txn.amount, token });
    if (!verified.ok) {
      await (db as any).walletTransaction.update({ where: { id: txn.id }, data: { status: "FAILED" } });
      return NextResponse.redirect(`${origin}/admin/wallet?result=failed`, 303);
    }

    // Credit the wallet atomically and snapshot the resulting balance on the row.
    await db.$transaction(async (tx) => {
      const shop = await (tx as any).shop.findUniqueOrThrow({ where: { id: txn.shopId } });
      const newBalance = (shop.walletBalance ?? 0) + txn.amount;
      await (tx as any).shop.update({ where: { id: txn.shopId }, data: { walletBalance: newBalance } });
      await (tx as any).walletTransaction.update({
        where: { id: txn.id },
        data: { status: "PAID", refId: verified.refId ?? null, balanceAfter: newBalance },
      });
    });

    return NextResponse.redirect(`${origin}/admin/wallet?result=success`, 303);
  } catch (e) {
    await logCaught(e, { source: "payment", path: "/api/wallet/callback", method: req.method });
    return NextResponse.redirect(`${origin}/admin/wallet?result=error`, 303);
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
