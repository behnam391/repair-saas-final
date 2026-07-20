import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { sendSms } from "@/lib/sms";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PartLine = z.object({ itemId: z.string(), quantity: z.number().int().min(1) });
const InvoiceSchema = z.object({
  ticketId: z.string(),
  laborCost: z.number().int().min(0),
  parts: z.array(PartLine).default([]),
  applyTax: z.boolean().default(true),
});

// GET /api/invoices — list invoices for the signed-in shop, newest first.
export async function GET() {
  try {
    const { shopId } = await requireSession();
    const invoices = await db.invoice.findMany({
      where: { shopId },
      include: {
        ticket: { include: { customer: true } },
        items: { include: { item: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invoices });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/invoices — closes out a repair: locks in parts cost from
// current inventory sell prices, deducts stock, and produces the invoice.
export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = InvoiceSchema.parse(await req.json());

    const ticket = await db.ticket.findFirst({ where: { id: body.ticketId, shopId } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });

    const invoice = await db.$transaction(async (tx) => {
      let partsCost = 0;
      for (const line of body.parts) {
        const item = await tx.inventoryItem.findFirst({ where: { id: line.itemId, shopId } });
        if (!item) throw new Error(`inventory item ${line.itemId} not found in this shop`);
        if (item.quantity < line.quantity) {
          throw new Error(`موجودی "${item.name}" کافی نیست`);
        }
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: line.quantity } },
        });
        await tx.ticketPart.create({
          data: {
            ticketId: ticket.id,
            itemId: item.id,
            quantity: line.quantity,
            priceCharged: item.sellPrice * line.quantity,
          },
        });
        partsCost += item.sellPrice * line.quantity;
      }

      const subtotal = body.laborCost + partsCost;
      const taxPercent = body.applyTax ? shop.taxPercent : 0;
      const taxAmount = Math.round((subtotal * taxPercent) / 100);
      const total = subtotal + taxAmount;

      const inv = await tx.invoice.create({
        data: {
          shopId,
          ticketId: ticket.id,
          laborCost: body.laborCost,
          partsCost,
          taxPercent,
          taxAmount,
          total,
        },
      });

      await tx.ticket.update({ where: { id: ticket.id }, data: { finalCost: total } });

      return inv;
    });

    // SMS the customer their invoice + online payment link (fire-and-forget;
    // silently skipped when no SMS provider is configured).
    try {
      const customer = await db.customer.findUnique({ where: { id: ticket.customerId } });
      if (customer?.phone) {
        const origin = req.nextUrl.origin;
        sendSms(
          customer.phone,
          `${shop.name}\n${customer.name} عزیز، فاکتور تعمیر دستگاه شما (کد پیگیری #${ticket.no}) به مبلغ ${invoice.total.toLocaleString("fa-IR")} تومان صادر شد.\nمشاهده و پرداخت آنلاین: ${origin}/pay/${invoice.id}`,
          shop.smsSenderName ?? undefined
        ).catch((e) => console.error("[invoices] sms failed", e));
      }
    } catch (e) {
      console.error("[invoices] payment-link sms skipped", e);
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    const message = e instanceof Error ? e.message : "internal_error";
    console.error(e);
    return NextResponse.json({ error: "internal_error", message }, { status: 500 });
  }
}
