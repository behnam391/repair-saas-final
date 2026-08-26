import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { preprocessPhone, preprocessDigits } from "@/lib/phone";
import { z } from "zod";
import { strongPassword, verifyOtp } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { LoginSubjectKind } from "@prisma/client";
import { revokeSessionsForSubject } from "@/lib/login-sessions";

export const dynamic = "force-dynamic";

const Schema = z.object({
  phone: z.preprocess(preprocessPhone, z.string().min(5)),
  code: z.preprocess(preprocessDigits, z.string().length(5)),
  newPassword: strongPassword,
});

// POST /api/customer/reset-password — verify the customer OTP and set the
// new password. Mirrors /api/auth/reset-password but against the fully
// separate PlatformCustomer tables.
export async function POST(req: NextRequest) {
  try {
    const { phone, code, newPassword } = Schema.parse(await req.json());
    const attemptLimit = await rateLimit(`customer-reset:${clientIp(req)}:${phone}`, 6, 10 * 60 * 1000);
    if (!attemptLimit.ok) { const t = tooMany(attemptLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }

    const customer = await db.platformCustomer.findUnique({ where: { phone } });
    if (!customer) {
      return NextResponse.json({ error: "invalid_code", message: "کد نامعتبر است." }, { status: 400 });
    }

    const token = await db.customerPasswordResetToken.findFirst({
      where: { customerId: customer.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!token || !verifyOtp(phone, code, token.code)) {
      return NextResponse.json({ error: "invalid_code", message: "کد نامعتبر یا منقضی شده است." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.$transaction([
      db.platformCustomer.update({ where: { id: customer.id }, data: { passwordHash } }),
      db.customerPasswordResetToken.update({ where: { id: token.id }, data: { used: true } }),
    ]);
    await revokeSessionsForSubject(LoginSubjectKind.CUSTOMER, customer.id, {
      reason: "PASSWORD_RESET",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const issue = e.issues[0];
      const field = issue?.path[0] === "newPassword" ? "newPassword" : issue?.path[0] === "code" ? "code" : "input";
      return NextResponse.json({ error: "invalid_input", field, message: issue?.message || "اطلاعات واردشده معتبر نیست." }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
