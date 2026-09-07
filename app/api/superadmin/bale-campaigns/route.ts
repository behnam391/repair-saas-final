import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { normalizePhone } from "@/lib/phone";
import { sendBaleOnly } from "@/lib/sms";
import { getPublicOrigin } from "@/lib/public-url";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";
export const maxDuration = 60;
const schema = z.object({ action: z.enum(["create", "send", "test"]), message: z.string().trim().min(1).max(1500).optional(), audience: z.enum(["all", "shops", "customers"]).default("all"), id: z.string().optional(), phone: z.string().optional() });
async function eligible(audience: string) {
  const [users, customers, preferences] = await Promise.all([
    audience === "customers" ? [] : db.user.findMany({ where: { active: true }, select: { phone: true } }),
    audience === "shops" ? [] : db.platformCustomer.findMany({ where: { active: true }, select: { phone: true } }),
    db.balePreference.findMany({ where: { enabled: true }, select: { phone: true } }),
  ]);
  const consent = new Set(preferences.map(p => p.phone));
  return [...new Set([...users, ...customers].map(u => normalizePhone(u.phone)))].filter(p => /^09\d{9}$/.test(p) && consent.has(p));
}
export async function GET() {
  try {
    await requireSuperAdmin("marketing");
    const campaigns = await db.baleCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { deliveries: { select: { status: true } } } });
    return NextResponse.json({ campaigns: campaigns.map(c => ({ id: c.id, message: c.message, audience: c.audience, total: c.deliveries.length, pending: c.deliveries.filter(d => d.status === "pending").length, accepted: c.deliveries.filter(d => d.status === "accepted").length, uncertain: c.deliveries.filter(d => d.status === "uncertain" || d.status === "sending").length })) });
  } catch { return NextResponse.json({ error: "دسترسی یا دریافت اطلاعات ممکن نشد" }, { status: 403 }); }
}
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin("marketing");
    const limit = await rateLimit(`bale-campaign:${admin.adminId}`, 20, 60000);
    if (!limit.ok) return NextResponse.json({ error: "تعداد درخواست زیاد است؛ یک دقیقه صبر کنید" }, { status: 429 });
    const body = schema.parse(await req.json());
    if (body.action === "test") {
      const phone = normalizePhone(body.phone);
      if (!/^09\d{9}$/.test(phone) || !body.message) return NextResponse.json({ error: "شماره و متن را کامل کنید" }, { status: 400 });
      const result = await sendBaleOnly(phone, `پیوو | آزمایشی\n${body.message}`);
      return NextResponse.json({ ok: result.ok });
    }
    if (body.action === "create") {
      if (!body.message) return NextResponse.json({ error: "متن لازم است" }, { status: 400 });
      const phones = await eligible(body.audience);
      const origin = getPublicOrigin(req.nextUrl.origin);
      const campaign = await db.baleCampaign.create({ data: { message: `${body.message}\nلغو دریافت پیشنهادها: ${origin}/bale-preferences`, audience: body.audience, deliveries: { create: phones.map(phone => ({ phone })) } } });
      return NextResponse.json({ id: campaign.id, total: phones.length });
    }
    if (!body.id) return NextResponse.json({ error: "شناسه لازم است" }, { status: 400 });
    const campaign = await db.baleCampaign.findUniqueOrThrow({ where: { id: body.id } });
    const allowed = new Set(await eligible(campaign.audience));
    const deliveries = await db.baleDelivery.findMany({ where: { campaignId: campaign.id, status: "pending" }, take: 5 });
    for (const d of deliveries) {
      const claimed = await db.baleDelivery.updateMany({ where: { id: d.id, status: "pending" }, data: { status: "sending" } });
      if (!claimed.count) continue;
      if (!allowed.has(d.phone)) { await db.baleDelivery.update({ where: { id: d.id }, data: { status: "skipped" } }); continue; }
      try {
        const result = await sendBaleOnly(d.phone, campaign.message);
        await db.baleDelivery.update({ where: { id: d.id }, data: { status: result.ok ? "accepted" : "failed" } });
      } catch { await db.baleDelivery.update({ where: { id: d.id }, data: { status: "uncertain" } }); }
    }
    return NextResponse.json({ ok: true, pending: await db.baleDelivery.count({ where: { campaignId: campaign.id, status: "pending" } }) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof UnauthorizedError ? "دسترسی ندارید" : "عملیات کامل نشد؛ گزارش را بررسی کنید" }, { status: e instanceof UnauthorizedError ? 403 : 400 });
  }
}
