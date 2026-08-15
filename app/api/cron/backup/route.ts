import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildBackupJson, sendBackupToTelegram } from "@/lib/backup";
import { logCaught } from "@/lib/logError";
import { decryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// GET /api/cron/backup — triggered daily by Vercel Cron (see vercel.json).
// Protected by the shared CRON_SECRET so random traffic can't trigger it.
// Builds a full snapshot and sends it to the configured Telegram chat. No-op
// (skipped) if Telegram isn't configured yet.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const s = (await db.platformSettings.findUnique({ where: { id: "singleton" } })) as any;
    if (!s?.telegramBotToken || !s?.telegramChatId) {
      return NextResponse.json({ ok: false, skipped: "telegram_not_configured" });
    }
    // Bot token is stored encrypted at rest; decrypt only here, at point of use.
    const botToken = decryptSecret(s.telegramBotToken);
    if (!botToken) {
      return NextResponse.json({ ok: false, skipped: "telegram_token_unreadable" });
    }
    const stamp = new Date().toISOString();
    const { json, filename } = await buildBackupJson(stamp);
    const r = await sendBackupToTelegram(
      botToken, s.telegramChatId, json, filename,
      `🗄️ بکاپ خودکار پیوو — ${stamp.slice(0, 10)}`
    );
    if (!r.ok) await logCaught(new Error(r.error || "telegram send failed"), { source: "server", path: "/api/cron/backup" });
    return NextResponse.json({ ok: r.ok, error: r.ok ? undefined : r.error });
  } catch (e) {
    await logCaught(e, { source: "server", path: "/api/cron/backup", method: "GET" });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
