import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { sendSms } from "@/lib/sms";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Line = z.object({ itemId: z.string(), quantity: z.number().int().min(1) });
const SaleSchema = z.object({
  items: z.array(Line).min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  applyTax: z.boolean().default(true),
  // optional manual override per line is intentionally NOT supported —
  // prices are locked from inventory sellPrice so staff can't undercut
  // silently; the owner edits the item price in /inventory instead.
});

// POST /api/sales — direct over-the-counter sale from inventory, no repair
// ticket involved: accessories, phones, spare parts, surplus stock. Locks
// prices from current sellPrice, deducts stock atomically, and issues a
// SALE-type invoice (visible in /invoices and printable like any other).
export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = SaleSchema.parse(await req.json());
    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });

    const invoice = await db.$transaction(async (tx) => {
      let partsCost = 0;
      const lines: { itemId: string; quantity: number; priceCharged: number }[] = [];

      for (const line of body.items) {
        const item = await tx.inventoryItem.findFirst({ where: { id: line.itemId, shopId } });
        if (!item) throw new Error("کالا در انبار این مغازه پیدا نشد");
        if (item.quantity < line.quantity) throw new Error(`موجودی «${item.name}» کافی نیست`);
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: line.quantity } },
        });
        const priceCharged = item.sellPrice * line.quantity;
        lines.push({ itemId: item.id, quantity: line.quantity, priceCharged });
        partsCost += priceCharged;
      }

      const taxPercent = body.applyTax ? shop.taxPercent : 0;
      const taxAmount = Math.round((partsCost * taxPercent) / 100);
      const total = partsCost + taxAmount;

      const inv = await tx.invoice.create({
        data: {
          shopId,
          type: "SALE",
          customerName: body.customerName || null,
          customerPhone: body.customerPhone || null,
          laborCost: 0,
          partsCost,
          taxPercent,
          taxAmount,
          total,
          items: { create: lines },
        },
      });
      return inv;
    });

    // Optional payment-link SMS for walk-in customers who left a number.
    if (body.customerPhone) {
      const origin = req.nextUrl.origin;
      sendSms(
        body.customerPhone,
        `${shop.name}\nفاکتور خرید شما به مبلغ ${invoice.total.toLocaleString("fa-IR")} تومان صادر شد.\nمشاهده و پرداخت آنلاین: ${origin}/pay/${invoice.id}`,
        shop.smsSenderName ?? undefined
      ).catch((e) => console.error("[sales] sms failed", e));
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    const message = e instanceof Error ? e.message : "internal_error";
    console.error(e);
    return NextResponse.json({ error: "sale_failed", message }, { status: 500 });
  }
}
