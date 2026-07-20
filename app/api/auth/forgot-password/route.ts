import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ phone: z.string().min(5), channel: z.enum(["sms", "email"]).default("sms") });

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
}

// POST /api/auth/forgot-password — no auth required (that's the point).
// Account lookup is always by phone (the unique login key); the OTP code
// itself can be delivered either via SMS or, if the account has an email
// on file, via email instead — useful when the person no longer has
// access to their old phone number.
// Always responds with the same generic message regardless of outcome,
// so this endpoint can't be used to check which numbers are registered.
export async function POST(req: NextRequest) {
  try {
    const { phone, channel } = Schema.parse(await req.json());

    // Honest capability check BEFORE looking the account up (so the answer
    // doesn't depend on whether the phone exists → no information leak).
    // Without it, users see "code sent" while nothing can actually arrive.
    // In local development the flow still works: the code is printed to the
    // server terminal by lib/sms.ts / lib/email.ts.
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev && channel === "sms" && !(await isSmsConfigured())) {
      return NextResponse.json(
        { error: "sms_not_configured", message: "سرویس پیامک هنوز روی این سرور فعال نشده است. مدیر پلتفرم باید کلید Kavenegar را در «پنل پلتفرم ← تنظیمات» ثبت کند، یا از گزینه ایمیل استفاده کنید." },
        { status: 503 }
      );
    }
    if (!isDev && channel === "email" && !(await isEmailConfigured())) {
      return NextResponse.json(
        { error: "email_not_configured", message: "سرویس ایمیل هنوز فعال نشده است. مدیر پلتفرم باید تنظیمات SMTP را در «پنل پلتفرم ← تنظیمات» ثبت کند، یا از گزینه پیامک استفاده کنید." },
        { status: 503 }
      );
    }
    const devHint = isDev && !(channel === "email" ? await isEmailConfigured() : await isSmsConfigured());

    const user = await db.user.findUnique({ where: { phone } });
    if (user) {
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await db.passwordResetToken.create({ data: { userId: user.id, code, expiresAt } });

      try {
        if (channel === "email" && user.email) {
          await sendEmail(user.email, "کد بازیابی رمز عبور", `کد بازیابی رمز عبور شما: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`);
        } else {
          await sendSms(phone, `کد بازیابی رمز عبور شما: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`);
        }
      } catch (e) {
        console.error("[forgot-password] failed to send OTP", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: devHint
        ? "حالت توسعه: سرویس ارسال هنوز تنظیم نشده — کد تأیید در ترمینال سرور (کنسول npm run dev) چاپ شد."
        : "اگر این شماره ثبت شده باشد، کد تأیید ارسال شد.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
