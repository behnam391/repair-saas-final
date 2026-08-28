import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ to: z.string().email() });

// POST /api/superadmin/test-email { to } — sends a one-off test email using the
// saved SMTP settings, so the super admin can confirm the configuration works
// before relying on it for password-recovery emails. Super-admin only. The real
// SMTP error (e.g. bad auth) is returned so misconfiguration is easy to debug.
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin("settings");
    const { to } = Schema.parse(await req.json());

    if (!(await isEmailConfigured())) {
      return NextResponse.json(
        { error: "not_configured", message: "ابتدا تنظیمات SMTP را کامل کن و ذخیره بزن، بعد تست کن." },
        { status: 400 }
      );
    }

    await sendEmail(
      to,
      "تست ایمیل پیوو",
      "این یک ایمیل آزمایشی از پنل پیوو است.\nاگر این پیام را دریافت کردید، تنظیمات SMTP شما درست کار می‌کند. ✅"
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_email", message: "ایمیل مقصد نامعتبر است." }, { status: 400 });
    return NextResponse.json({ error: "send_failed", message: (e as Error).message }, { status: 500 });
  }
}
