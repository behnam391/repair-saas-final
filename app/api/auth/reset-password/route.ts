import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  phone: z.string().min(5),
  code: z.string().length(5),
  newPassword: z.string().min(4),
});

// POST /api/auth/reset-password — verify the OTP and set the new password.
export async function POST(req: NextRequest) {
  try {
    const { phone, code, newPassword } = Schema.parse(await req.json());

    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ error: "invalid_code", message: "کد نامعتبر است." }, { status: 400 });
    }

    const token = await db.passwordResetToken.findFirst({
      where: { userId: user.id, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!token) {
      return NextResponse.json({ error: "invalid_code", message: "کد نامعتبر یا منقضی شده است." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.passwordResetToken.update({ where: { id: token.id }, data: { used: true } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
