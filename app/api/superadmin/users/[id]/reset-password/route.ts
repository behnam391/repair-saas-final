import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ newPassword: z.string().min(4) });

// PATCH /api/superadmin/users/:id/reset-password — for support cases where
// a user can't receive the SMS OTP (lost phone number). The platform admin
// should only do this after verifying identity by other means (email,
// documents, etc.) — this endpoint does not verify anything itself.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const { newPassword } = Schema.parse(await req.json());
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: params.id }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
