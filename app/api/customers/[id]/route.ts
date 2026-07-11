import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ name: z.string().min(1).optional(), phone: z.string().min(5).optional() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const body = Schema.parse(await req.json());
    const customer = await db.customer.updateMany({ where: { id: params.id, shopId }, data: body });
    if (customer.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const ticketCount = await db.ticket.count({ where: { customerId: params.id, shopId } });
    if (ticketCount > 0) {
      return NextResponse.json({ error: "has_tickets", message: "این مشتری سابقه تعمیر دارد و قابل حذف نیست." }, { status: 409 });
    }
    await db.customer.deleteMany({ where: { id: params.id, shopId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
