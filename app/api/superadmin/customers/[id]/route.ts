import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { deletePlatformCustomerCascade } from "@/lib/cascade";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ active: z.boolean() });

// PATCH /api/superadmin/customers/:id — suspend / re-activate a nationwide
// customer account. A suspended customer can no longer sign in (checked in
// lib/auth.ts) — their existing ratings stay, but they can't add more.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const { active } = Schema.parse(await req.json());
    const customer = await db.platformCustomer.update({
      where: { id: params.id },
      data: { active },
      select: { id: true, name: true, active: true },
    });
    return NextResponse.json({ customer });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// DELETE /api/superadmin/customers/:id — permanently remove a nationwide
// customer account and their data (super-admin only). Irreversible.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const customer = await db.platformCustomer.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await deletePlatformCustomerCascade(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[superadmin] customer delete failed", e);
    return NextResponse.json({ error: "internal_error", message: "حذف مشتری ناموفق بود" }, { status: 500 });
  }
}
