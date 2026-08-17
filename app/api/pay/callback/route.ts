import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayment, parseCallback, collectCallbackParams, type ProviderKey } from "@/lib/payments";
import { logCaught } from "@/lib/logError";
import { getPublicOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

// /api/pay/callback?invoiceId=...  (+ gateway params)
// The active gateway redirects the customer's browser here after paying an
// invoice. Mirrors /api/billing/callback: only the stored token + the
// gateway's verify response are trusted. Handles GET (Zarinpal/Zibal) and
// POST (NextPay).
async function handle(req: NextRequest) {
  const origin = getPublicOrigin(req.nextUrl.origin);
  let invoiceId: string | null = null;
  try {
    const params = await collectCallbackParams(req);
    invoiceId = params.get("invoiceId") || req.nextUrl.searchParams.get("invoiceId");

    if (!invoiceId) return NextResponse.redirect(`${origin}/pay/error`, 303);

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=error`, 303);

    if (invoice.paid) {
      return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=success`, 303);
    }

    const provider = (((invoice as any).paymentProvider as ProviderKey) || "zarinpal");
    const { token, success } = parseCallback(provider, params);

    if (!token || invoice.paymentAuthority !== token) {
      return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=error`, 303);
    }

    if (!success) {
      return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=cancelled`, 303);
    }

    const pendingAmount = invoice.paymentPendingAmount ?? Math.max(0, invoice.total - invoice.paidAmount);
    const verified = await verifyPayment({ provider, amountToman: pendingAmount, token });
    if (!verified.ok) {
      return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=failed`, 303);
    }

    await db.$transaction(async (tx) => {
      const fresh = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      if (fresh.paid) return;
      const amount = fresh.paymentPendingAmount ?? Math.max(0, fresh.total - fresh.paidAmount);
      const paidAmount = Math.min(fresh.total, fresh.paidAmount + amount);
      await tx.invoice.update({
        where: { id: fresh.id },
        data: {
          paidAmount,
          paid: paidAmount >= fresh.total,
          paymentRefId: verified.refId ?? null,
          paymentPendingAmount: null,
          lastPaymentAt: new Date(),
        },
      });
    });

    return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=success`, 303);
  } catch (e) {
    await logCaught(e, { source: "payment", path: "/api/pay/callback", method: req.method, context: invoiceId ? { invoiceId } : null });
    const dest = invoiceId ? `${origin}/pay/${invoiceId}?result=error` : `${origin}/pay/error`;
    return NextResponse.redirect(dest, 303);
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
