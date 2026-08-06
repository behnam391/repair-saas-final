import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayment, parseCallback, collectCallbackParams, type ProviderKey } from "@/lib/payments";
import { logCaught } from "@/lib/logError";

export const dynamic = "force-dynamic";

// /api/pay/callback?invoiceId=...  (+ gateway params)
// The active gateway redirects the customer's browser here after paying an
// invoice. Mirrors /api/billing/callback: only the stored token + the
// gateway's verify response are trusted. Handles GET (Zarinpal/Zibal) and
// POST (NextPay).
async function handle(req: NextRequest) {
  const origin = req.nextUrl.origin;
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

    const verified = await verifyPayment({ provider, amountToman: invoice.total, token });
    if (!verified.ok) {
      return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=failed`, 303);
    }

    await db.invoice.updateMany({
      where: { id: invoice.id, paid: false },
      data: { paid: true, paymentRefId: verified.refId ?? null },
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
