import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["OWNER", "FRONTDESK", "HARDWARE", "SOFTWARE", "BOARD"]).optional(),
  active: z.boolean().optional(),
  email: z.string().optional(),
  gmailId: z.string().optional(),
  nationalId: z.string().optional(),
});

// PATCH /api/staff/:id — owner-only, and only within their own shop.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const target = await db.user.findFirst({ where: { id: params.id, shopId } });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = UpdateSchema.parse(await req.json());
    const user = await db.user.update({
      where: { id: target.id },
      data: body,
      select: { id: true, name: true, phone: true, role: true, active: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
