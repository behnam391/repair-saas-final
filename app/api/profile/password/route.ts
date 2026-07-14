import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(4) });

// PATCH /api/profile/password — works for any signed-in user (staff or owner).
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { currentPassword, newPassword } = Schema.parse(await req.json());

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "wrong_password", message: "رمز فعلی اشتباه است" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: userId }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
