import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { deleteCustomerCascade } from "@/lib/cascade";
import { preprocessPhone } from "@/lib/phone";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.preprocess(preprocessPhone, z.string().min(5).optional()),
  email: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    const body = Schema.parse(await req.json());
    const customer = await db.customer.updateMany({ where: { id: params.id, shopId }, data: body as any });
    if (customer.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// DELETE /api/customers/:id           → refuses (409) if the customer has repairs
// DELETE /api/customers/:id?force=true → deletes the customer AND their repairs
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    const force = new URL(req.url).searchParams.get("force") === "true";

    const ticketCount = await db.ticket.count({ where: { customerId: params.id, shopId } });
    if (ticketCount > 0 && !force) {
      return NextResponse.json(
        { error: "has_tickets", ticketCount, message: `این مشتری ${ticketCount} تعمیر دارد.` },
        { status: 409 }
      );
    }

    // deleteCustomerCascade also handles the no-tickets case (deletes 0 tickets,
    // then the customer), so it's safe to always use here.
    await deleteCustomerCascade(shopId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
