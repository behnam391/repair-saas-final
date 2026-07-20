import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayment } from "@/lib/zarinpal";

export const dynamic = "force-dynamic";

// GET /api/pay/callback?invoiceId=...&Authority=...&Status=OK|NOK
// Zarinpal redirects the customer's browser here after paying an invoice.
// Mirrors /api/billing/callback: only the stored authority + Zarinpal's
// verify response are trusted, never the Status query param alone.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const invoiceId = searchParams.get("invoiceId");
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");
  const origin = req.nextUrl.origin;

  if (!invoiceId || !authority) {
    return NextResponse.redirect(`${origin}/pay/error`);
  }

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.paymentAuthority !== authority) {
    return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=error`);
  }

  if (invoice.paid) {
    return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=success`);
  }

  if (status !== "OK") {
    return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=cancelled`);
  }

  const verified = await verifyPayment({ amountToman: invoice.total, authority });
  if (!verified.ok) {
    return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=failed`);
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: { paid: true, paymentRefId: verified.refId ?? null },
  });

  return NextResponse.redirect(`${origin}/pay/${invoiceId}?result=success`);
}
