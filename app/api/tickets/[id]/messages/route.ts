import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET — the customer⇄shop thread for a ticket owned by this shop. Marks the
// customer's messages as read by the shop.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const ticket = await db.ticket.findFirst({ where: { id: params.id, shopId }, select: { id: true } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const messages = await db.ticketMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, fromCustomer: true, content: true, createdAt: true },
    });
    await db.ticketMessage.updateMany({
      where: { ticketId: ticket.id, fromCustomer: true, readByShop: false },
      data: { readByShop: true },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({ content: z.string().min(1).max(2000) });

// POST — shop staff replies. Left unread for the customer so their panel can
// badge the new message.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId } = await requireSession();
    const ticket = await db.ticket.findFirst({ where: { id: params.id, shopId }, select: { id: true } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { content } = Schema.parse(await req.json());
    const message = await db.ticketMessage.create({
      data: { ticketId: ticket.id, fromCustomer: false, senderUserId: userId, content, readByShop: true, readByCustomer: false },
      select: { id: true, fromCustomer: true, content: true, createdAt: true },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
