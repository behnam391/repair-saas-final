import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ stars: z.number().int().min(1).max(5), comment: z.string().optional() });

// GET /api/rate/:ticketId — public lookup so the rating page can show
// which shop/technician it's rating without requiring login.
export async function GET(_req: NextRequest, { params }: { params: { ticketId: string } }) {
  const ticket = await db.ticket.findUnique({
    where: { id: params.ticketId },
    select: { deviceModel: true, shop: { select: { name: true } }, assignedTo: { select: { name: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const existing = await db.rating.findUnique({ where: { ticketId: params.ticketId } });
  return NextResponse.json({ ticket, alreadyRated: !!existing });
}

// POST /api/rate/:ticketId — public, no login. One rating per ticket.
export async function POST(req: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const ticket = await db.ticket.findUnique({ where: { id: params.ticketId } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const existing = await db.rating.findUnique({ where: { ticketId: params.ticketId } });
    if (existing) return NextResponse.json({ error: "already_rated" }, { status: 409 });

    const { stars, comment } = Schema.parse(await req.json());
    const rating = await db.rating.create({
      data: {
        shopId: ticket.shopId, ticketId: ticket.id, technicianId: ticket.assignedToId, stars, comment,
      },
    });
    return NextResponse.json({ rating }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
