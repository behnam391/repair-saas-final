import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
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
