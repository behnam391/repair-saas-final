import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Confirm this ticket belongs to the signed-in customer — matched strictly
// by the phone on their session (never a request-supplied value), exactly
// like /api/customer/my-repairs. Returns the ticket + shop when owned.
async function ownedTicket(ticketId: string, phone: string) {
  return db.ticket.findFirst({
    where: { id: ticketId, customer: { phone } },
    select: { id: true, shopId: true, no: true, deviceModel: true },
  });
}

// GET — full message thread for one of the customer's own repairs. Also
// marks the shop's messages as read by the customer.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { phone } = await requireCustomer();
    const ticket = await ownedTicket(params.id, phone);
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const messages = await db.ticketMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, fromCustomer: true, content: true, createdAt: true },
    });
    await db.ticketMessage.updateMany({
      where: { ticketId: ticket.id, fromCustomer: false, readByCustomer: false },
      data: { readByCustomer: true },
    });

    return NextResponse.json({ messages, ticket });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({ content: z.string().min(1).max(2000) });

// POST — customer sends a message; every active staff member of the shop
// gets a notification so they see it in the ticket.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { phone, name } = await requireCustomer();
    const ticket = await ownedTicket(params.id, phone);
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { content } = Schema.parse(await req.json());
    const message = await db.ticketMessage.create({
      data: { ticketId: ticket.id, fromCustomer: true, content, readByShop: false, readByCustomer: true },
      select: { id: true, fromCustomer: true, content: true, createdAt: true },
    });

    try {
      const users = await db.user.findMany({ where: { shopId: ticket.shopId, active: true }, select: { id: true } });
      if (users.length) {
        await db.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            title: "💬 پیام مشتری",
            message: `${name ?? "مشتری"} درباره ${ticket.deviceModel} (#${ticket.no})`,
            link: "/tickets",
          })),
        });
      }
    } catch (e) { console.error("[ticket-msg] notify failed", e); }

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
