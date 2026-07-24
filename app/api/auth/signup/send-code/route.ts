import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
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
      else await sendSms(phone, text);
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
