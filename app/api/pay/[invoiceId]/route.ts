import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestPayment } from "@/lib/zarinpal";

export const dynamic = "force-dynamic";

// GET /api/pay/:invoiceId — public invoice summary for the customer-facing
// payment page (/pay/[invoiceId]). No login: the invoice id is an unguessable
// cuid delivered to the customer by SMS (same capability-URL model as the
// rating link). Only customer-safe fields are exposed.
export async function GET(_req: NextRequest, { params }: { params: { invoiceId: string } }) {
  const invoice = await db.invoice.findUnique({
    where: { id: params.invoiceId },
    select: {
      id: true, type: true, laborCost: true, partsCost: true, taxPercent: true, taxAmount: true,
      total: true, paid: true, paymentRefId: true, createdAt: true, customerName: true,
      shop: { select: { name: true, phone: true, address: true } },
      ticket: { select: { no: true, deviceModel: true, customer: { select: { name: true } } } },
      items: { select: { quantity: true, priceCharged: true, item: { select: { name: true } } } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

// POST /api/pay/:invoiceId — start an online Zarinpal payment for this
// invoice. Public for the same reason as GET; the amount always comes from
// the invoice row, never from the client.
export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: params.invoiceId },
      include: { shop: { select: { name: true } } },
    });
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (invoice.paid) return NextResponse.json({ error: "already_paid", message: "این فاکتور قبلاً پرداخت شده است" }, { status: 409 });
    if (invoice.total <= 0) return NextResponse.json({ error: "zero_amount", message: "مبلغ فاکتور صفر است" }, { status: 400 });

    const origin = req.nextUrl.origin;
    const { authority, payUrl } = await requestPayment({
      amountToman: invoice.total,
      description: `پرداخت فاکتور ${invoice.shop.name} — ${invoice.id.slice(0, 8)}`,
      callbackUrl: `${origin}/api/pay/callback?invoiceId=${invoice.id}`,
    });

    await db.invoice.update({ where: { id: invoice.id }, data: { paymentAuthority: authority } });

    return NextResponse.json({ payUrl });
  } catch (e) {
    console.error("[pay] checkout failed", e);
    return NextResponse.json({ error: "checkout_failed", message: (e as Error).message }, { status: 500 });
  }
}
