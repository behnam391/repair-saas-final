import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
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

    return NextResponse.json({ ok: true, message: "اگر این شماره ثبت شده باشد، کد تأیید ارسال شد." });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
