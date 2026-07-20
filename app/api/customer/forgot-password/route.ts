import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ phone: z.string().min(5) });

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
}

// POST /api/customer/forgot-password — customer-account counterpart of the
// staff forgot-password flow. Same privacy rule: always answers with the
// same generic message so it can't be used to probe which numbers exist.
export async function POST(req: NextRequest) {
  try {
    const { phone } = Schema.parse(await req.json());

    const customer = await db.platformCustomer.findUnique({ where: { phone } });
    if (customer) {
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await db.customerPasswordResetToken.create({ data: { customerId: customer.id, code, expiresAt } });
      try {
        await sendSms(phone, `کد بازیابی رمز عبور شما: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`);
      } catch (e) {
        console.error("[customer-forgot-password] failed to send OTP", e);
      }
    }

    return NextResponse.json({ ok: true, message: "اگر این شماره ثبت شده باشد، کد تأیید ارسال شد." });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
