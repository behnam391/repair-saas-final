import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { buildBackupJson, sendBackupToTelegram } from "@/lib/backup";

export const dynamic = "force-dynamic";

// GET /api/superadmin/backup — super-admin only. Streams a full JSON snapshot of
// the whole database as a file download. Nothing is stored on the server (the
// dump includes password hashes and personal data, so it must never sit in a
// public bucket) — it goes straight to the admin's machine over HTTPS. The
// database provider's own PITR is the automatic safety net.
export async function GET() {
  try {
    await requireSuperAdmin("maintenance");
    const { json, filename } = await buildBackupJson(new Date().toISOString());
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/superadmin/backup — send a backup to Telegram right now, to verify
// the bot config (the daily cron does the same automatically).
export async function POST() {
  try {
    await requireSuperAdmin("maintenance");
    const s = (await db.platformSettings.findUnique({ where: { id: "singleton" } })) as any;
    if (!s?.telegramBotToken || !s?.telegramChatId) {
      return NextResponse.json({ error: "not_configured", message: "ابتدا توکن ربات و شناسه‌ی چت تلگرام را ذخیره کن." }, { status: 400 });
    }
    const { json, filename } = await buildBackupJson(new Date().toISOString());
    const r = await sendBackupToTelegram(s.telegramBotToken, s.telegramChatId, json, filename, "🧪 بکاپ آزمایشی پیوو");
    if (!r.ok) return NextResponse.json({ error: "send_failed", message: r.error || "ارسال به تلگرام ناموفق بود" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error", message: (e as Error).message }, { status: 500 });
  }
}
