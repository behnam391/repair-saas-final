import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/invoices/:id — full detail, used by the print view.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const invoice = await db.invoice.findFirst({
      where: { id: params.id, shopId },
      include: {
        shop: { select: { name: true, address: true, phone: true, bankCardNumber: true, bankAccountNumber: true } },
        ticket: {
          include: {
            customer: true,
            partsUsed: { include: { item: { select: { name: true } } } },
          },
        },
        items: { include: { item: { select: { name: true } } } },
      },
    });
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  laborCost: z.number().int().min(0).optional(),
  applyTax: z.boolean().optional(),
  paid: z.boolean().optional(),
});

// PATCH /api/invoices/:id — edit labor cost, toggle tax, or mark paid.
// Parts already deducted from inventory are not re-editable here (use
// delete + reissue if the parts list needs to change) — recalculating
// stock deltas mid-edit risks corrupting inventory counts.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const invoice = await db.invoice.findFirst({ where: { id: params.id, shopId } });
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = UpdateSchema.parse(await req.json());
    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });

    const laborCost = body.laborCost ?? invoice.laborCost;
    const applyTax = body.applyTax ?? invoice.taxPercent > 0;
    const subtotal = laborCost + invoice.partsCost;
    const taxPercent = applyTax ? shop.taxPercent : 0;
    const taxAmount = Math.round((subtotal * taxPercent) / 100);
    const total = subtotal + taxAmount;

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id: invoice.id },
        data: { laborCost, taxPercent, taxAmount, total, ...(body.paid !== undefined ? { paid: body.paid } : {}) },
      });
      // SALE invoices have no ticket to keep in sync.
      if (invoice.ticketId) {
        await tx.ticket.update({ where: { id: invoice.ticketId }, data: { finalCost: total } });
      }
      return inv;
    });

    return NextResponse.json({ invoice: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// DELETE /api/invoices/:id — restores any parts back to inventory before
// removing the invoice, so stock counts stay correct.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const invoice = await db.invoice.findFirst({ where: { id: params.id, shopId } });
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await db.$transaction(async (tx) => {
      if (invoice.ticketId) {
        // Repair invoice — restore the ticket's consumed parts.
        const parts = await tx.ticketPart.findMany({ where: { ticketId: invoice.ticketId } });
        for (const p of parts) {
          await tx.inventoryItem.update({ where: { id: p.itemId }, data: { quantity: { increment: p.quantity } } });
        }
        await tx.ticketPart.deleteMany({ where: { ticketId: invoice.ticketId } });
      }
      // Direct-sale line items — restore sold stock.
      const saleLines = await tx.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
      for (const line of saleLines) {
        await tx.inventoryItem.update({ where: { id: line.itemId }, data: { quantity: { increment: line.quantity } } });
      }
      await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoice.delete({ where: { id: invoice.id } });
      if (invoice.ticketId) {
        await tx.ticket.update({ where: { id: invoice.ticketId }, data: { finalCost: null } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
