import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { sendRepairNotification } from "@/lib/sms";
import { getPublicOrigin } from "@/lib/public-url";
import { z } from "zod";
import { listPagination } from "@/lib/list-pagination";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PartLine = z.object({ itemId: z.string(), quantity: z.number().int().min(1) });
const InvoiceSchema = z.object({
  ticketId: z.string(),
  laborCost: z.number().int().min(0),
  parts: z.array(PartLine).default([]),
  applyTax: z.boolean().default(true),
  paidAmount: z.number().int().min(0).default(0),
});

// GET /api/invoices — list invoices for the signed-in shop, newest first.
export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
    const params = req.nextUrl.searchParams;
    const paged = params.has("page");
    const paging = listPagination(params);
    const q = (params.get("q") || "").trim().slice(0,150);
    const status = params.get("status");
    const where: Prisma.InvoiceWhereInput = { shopId, ...(status === "paid" ? { paid: true } : status === "unpaid" ? { paid: false } : {}), ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { ticket: { deviceModel: { contains: q, mode: "insensitive" } } }, { ticket: { customer: { name: { contains: q, mode: "insensitive" } } } }, ...( /^\d+$/.test(q) && Number.isSafeInteger(Number(q)) && Number(q) <= 2147483647 ? [{ ticket: { no: Number(q) } }] : [])] } : {}) };
    const invoices = await db.invoice.findMany({
      where,
      include: {
        ticket: { include: { customer: true } },
        items: { include: { item: { select: { name: true } } } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(paged ? { skip: paging.skip, take: paging.take } : {}),
    });
    const summary = paged ? await db.$queryRaw<{ receivable: number; outstanding: number; partial: number }[]>`
      SELECT COALESCE(SUM(GREATEST(0, "total"::bigint - "paidAmount")), 0)::float8 AS "receivable",
        COUNT(*)::int AS "outstanding", COUNT(*) FILTER (WHERE "paidAmount" > 0)::int AS "partial"
      FROM "Invoice" WHERE "shopId" = ${shopId} AND "paid" = false
    ` : [];
    return NextResponse.json({ invoices, ...(paged ? { total: await db.invoice.count({ where }), page: paging.page, summary: summary[0] ?? { receivable: 0, outstanding: 0, partial: 0 } } : {}) });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/invoices — closes out a repair: locks in parts cost from
// current inventory sell prices, deducts stock, and produces the invoice.
export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
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
      const paidAmount = Math.min(total, body.paidAmount);

      const inv = await tx.invoice.create({
        data: {
          shopId,
          ticketId: ticket.id,
          laborCost: body.laborCost,
          partsCost,
          taxPercent,
          taxAmount,
          total,
          paidAmount,
          paid: paidAmount >= total,
          lastPaymentAt: paidAmount > 0 ? new Date() : null,
        },
      });

      await tx.ticket.update({ where: { id: ticket.id }, data: { finalCost: total } });

      return inv;
    });

    // Await the provider before the serverless request finishes.
    try {
      const customer = await db.customer.findUnique({ where: { id: ticket.customerId } });
      if (customer?.phone) {
        const origin = getPublicOrigin(req.nextUrl.origin);
        await sendRepairNotification(
          customer.phone,
          `${shop.name}\n${customer.name} عزیز، فاکتور تعمیر دستگاه شما (کد پیگیری #${ticket.no}) به مبلغ ${invoice.total.toLocaleString("fa-IR")} تومان صادر شد.\nپرداخت‌شده: ${invoice.paidAmount.toLocaleString("fa-IR")} تومان\nمانده: ${(invoice.total - invoice.paidAmount).toLocaleString("fa-IR")} تومان\nمشاهده و پرداخت آنلاین: ${origin}/pay/${invoice.id}`
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
