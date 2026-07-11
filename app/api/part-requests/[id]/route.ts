import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ status: z.enum(["FULFILLED", "REJECTED"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);
    const { status } = Schema.parse(await req.json());
    const updated = await db.partRequest.updateMany({ where: { id: params.id, shopId }, data: { status } });
    if (updated.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
