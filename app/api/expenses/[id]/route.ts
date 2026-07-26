import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// DELETE /api/expenses/:id — OWNER-only, scoped to the caller's shop.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const target = await (db as any).expense.findFirst({ where: { id: params.id, shopId } });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await (db as any).expense.delete({ where: { id: target.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
