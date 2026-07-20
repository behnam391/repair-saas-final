import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

// GET /api/cron/subscription-reminders
// Triggered by Vercel Cron (see vercel.json) once a day. Protects itself
// with a shared secret so random internet traffic can't spam SMS credits.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringShops = await db.shop.findMany({
    where: { planExpiresAt: { gte: now, lte: in3Days }, plan: { not: "free" }, active: true },
    include: { users: { where: { role: "OWNER" }, take: 1 } },
  });

  let sent = 0;
  for (const shop of expiringShops) {
    const owner = shop.users[0];
    if (!owner) continue;
    try {
      await sendSms(
        owner.phone,
        `${shop.name}\nاشتراک شما تا ${shop.planExpiresAt?.toLocaleDateString("fa-IR")} اعتبار دارد. برای جلوگیری از قطع سرویس، از پنل مدیریت تمدید کنید.`
      );
      sent++;
    } catch (e) {
      console.error("[cron] failed to send renewal reminder", shop.id, e);
    }
  }

  return NextResponse.json({ checked: expiringShops.length, sent });
}
