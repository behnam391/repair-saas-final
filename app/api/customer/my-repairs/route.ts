import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer/my-repairs — every repair ticket, across ALL shops,
// whose intake customer record matches this customer's verified phone
// number. Deliberately cross-tenant: this is the customer reading their
// OWN repair history, matched strictly by the phone on their session
// token (never a phone supplied in the request). Only customer-safe
// fields are exposed — no internal notes, wages, or passcodes.
export async function GET() {
  try {
    const { phone } = await requireCustomer();

    const tickets = await db.ticket.findMany({
      where: { customer: { phone } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, no: true, deviceModel: true, status: true, lane: true,
        estimatedCost: true, finalCost: true,
        createdAt: true, deliveredAt: true,
        shop: { select: { id: true, name: true, phone: true, province: true, address: true } },
        invoice: { select: { total: true, paid: true } },
      },
    });

    // one rating lookup so the UI can offer "امتیاز بدهید" only once per ticket
    const ratedTicketIds = new Set(
      (
        await db.rating.findMany({
          where: { ticketId: { in: tickets.map((t) => t.id) } },
          select: { ticketId: true },
        })
      ).map((r) => r.ticketId)
    );

    return NextResponse.json({
      tickets: tickets.map((t) => ({ ...t, rated: ratedTicketIds.has(t.id) })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
