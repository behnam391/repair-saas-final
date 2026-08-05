import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms, sendCodeSms, isSmsConfigured } from "@/lib/sms";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { preprocessPhone } from "@/lib/phone";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  // preprocess → the code is stored against the CANONICAL number, so it is
  // still found when the person later types the same number with a different
  // keyboard. See lib/phone.ts.
  phone: z.preprocess(preprocessPhone, z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست")),
  channel: z.enum(["sms", "email"]).default("sms"),
  email: z.string().email().optional().or(z.literal("")),
});

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
}

// POST /api/auth/signup/send-code — sends a verification code to the phone
// (SMS) or a given email, BEFORE the account is created. Reuses the same
// SMS/email infrastructure as password reset.
export async function POST(req: NextRequest) {
  try {
    const { phone, channel, email } = Schema.parse(await req.json());

    // Abuse guards: per-IP burst limit + per-phone limit (in-memory), plus a
    // DB-backed 60s per-phone cooldown that holds even across instances — the
    // real protection against someone draining the SMS credit.
    const ipLimit = rateLimit(`sendcode:ip:${clientIp(req)}`, 8, 10 * 60 * 1000);
    if (!ipLimit.ok) { const t = tooMany(ipLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }
    const phoneLimit = rateLimit(`sendcode:phone:${phone}`, 4, 10 * 60 * 1000);
    if (!phoneLimit.ok) { const t = tooMany(phoneLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }

    const recent = await db.signupVerification.findFirst({
      where: { identifier: phone, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return NextResponse.json({ message: "کد قبلی هنوز معتبر است. لطفاً کمی صبر کنید و اگر پیامک نرسید، چند لحظه بعد دوباره تلاش کنید." }, { status: 429 });
    }

    const isDev = process.env.NODE_ENV !== "production";
    if (channel === "email" && !email) {
      return NextResponse.json({ message: "برای ارسال کد به ایمیل، ابتدا ایمیل را وارد کنید" }, { status: 400 });
    }
    if (!isDev && channel === "sms" && !(await isSmsConfigured())) {
      return NextResponse.json({ message: "سرویس پیامک هنوز فعال نشده — از گزینه ایمیل استفاده کنید یا با پشتیبانی تماس بگیرید." }, { status: 503 });
    }
    if (!isDev && channel === "email" && !(await isEmailConfigured())) {
      return NextResponse.json({ message: "سرویس ایمیل هنوز فعال نشده — از گزینه پیامک استفاده کنید." }, { status: 503 });
    }
    const devHint = isDev && !(channel === "email" ? await isEmailConfigured() : await isSmsConfigured());

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    // Clear any previous codes for this phone, then store the fresh one.
    await db.signupVerification.deleteMany({ where: { identifier: phone } });
    await db.signupVerification.create({ data: { identifier: phone, code, expiresAt } });

    try {
      const text = `کد تأیید ثبت‌نام شما در Peyvo: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`;
      if (channel === "email" && email) await sendEmail(email, "کد تأیید ثبت‌نام Peyvo", text);
      else await sendCodeSms(phone, code, text);
    } catch (e) {
      console.error("[signup] failed to send OTP", e);
    }

    return NextResponse.json({
      ok: true,
      message: devHint
        ? "حالت توسعه: سرویس ارسال تنظیم نشده — کد در ترمینال سرور چاپ شد."
        : channel === "email" ? "کد تأیید به ایمیل ارسال شد." : "کد تأیید پیامک شد.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ message: e.errors[0]?.message ?? "ورودی نامعتبر" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
