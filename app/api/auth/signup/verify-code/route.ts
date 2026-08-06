import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { preprocessPhone, preprocessDigits } from "@/lib/phone";
import { z } from "zod";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { verifyOtp } from "@/lib/security";

export const dynamic = "force-dynamic";

const Schema = z.object({
  phone: z.preprocess(preprocessPhone, z.string().regex(/^09\d{9}$/)),
  // The OTP arrives as Latin digits but gets retyped on a Farsi keyboard.
  code: z.preprocess(preprocessDigits, z.string().min(4).max(6)),
});

// POST /api/auth/signup/verify-code — checks the code for a phone and marks
// the pending verification as verified, so the signup endpoint will accept
// this phone. Does NOT create any account.
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = Schema.parse(await req.json());
    const attemptLimit = await rateLimit(`verify-signup:${clientIp(req)}:${phone}`, 6, 10 * 60 * 1000);
    if (!attemptLimit.ok) { const t = tooMany(attemptLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }
    const rec = await db.signupVerification.findFirst({
      where: { identifier: phone, verified: false },
      orderBy: { createdAt: "desc" },
    });
    if (!rec || !verifyOtp(phone, code.trim(), rec.code)) return NextResponse.json({ message: "کد وارد شده نادرست است" }, { status: 400 });
    if (rec.expiresAt < new Date()) return NextResponse.json({ message: "کد منقضی شده — دوباره کد بگیرید" }, { status: 400 });

    await db.signupVerification.update({ where: { id: rec.id }, data: { verified: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ message: "ورودی نامعتبر" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
