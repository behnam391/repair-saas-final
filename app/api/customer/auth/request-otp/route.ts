import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ phone: z.string().min(5) });

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

// POST /api/customer/auth/request-otp — public. Works for both first-time
// signup and returning login; the customer-credentials provider handles
// find-or-create on verify.
export async function POST(req: NextRequest) {
  try {
    const { phone } = Schema.parse(await req.json());
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.customerOtp.create({ data: { phone, code, expiresAt } });

    try {
      await sendSms(phone, `کد ورود شما به پنل مشتریان: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`);
    } catch (e) {
      console.error("[customer-otp] failed to send", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
