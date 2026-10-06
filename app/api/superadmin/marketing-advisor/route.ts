import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runCompletion } from "@/lib/ai";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { buildMarketingAdvisorPrompt, parseMarketingAdvisorResult } from "@/lib/ai/tasks/marketing-advisors";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Schema = z.object({
  mode: z.enum(["growth", "strategy", "council"]),
  objective: z.string().trim().min(10).max(1500),
  audience: z.string().trim().min(2).max(300),
  constraints: z.string().trim().max(600).optional(),
});

function percent(part: number, total: number) { return total ? Math.round(part / total * 100) : 0; }

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin("marketing");
    const body = Schema.parse(await req.json());
    const since30 = new Date(Date.now() - 30 * 86400000);
    const [shops, ticketsTotal, tickets30, delivered30, paidSubscriptions, users] = await Promise.all([
      db.shop.findMany({ select: { active: true, plan: true, serviceCategories: true, createdAt: true } }),
      db.ticket.count(), db.ticket.count({ where: { createdAt: { gte: since30 } } }),
      db.ticket.count({ where: { deliveredAt: { gte: since30 } } }),
      db.subscription.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
      db.user.count({ where: { active: true } }),
    ]);
    const categoryCounts: Record<string, number> = {};
    for (const shop of shops) for (const category of shop.serviceCategories.split(",").filter(Boolean)) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    const paidShops = shops.filter(shop => shop.plan !== "free").length;
    const snapshot = {
      generatedAt: new Date().toISOString(),
      shops: { total: shops.length, active: shops.filter(shop => shop.active).length, newLast30Days: shops.filter(shop => shop.createdAt >= since30).length, paid: paidShops, paidSharePercent: percent(paidShops, shops.length), byCategory: categoryCounts },
      usage: { activeUsers: users, ticketsTotal, ticketsLast30Days: tickets30, deliveredLast30Days: delivered30 },
      subscriptionRevenueToman: paidSubscriptions._sum.amount || 0,
      paidTransactions: paidSubscriptions._count,
      knownConstraints: ["بودجه تبلیغاتی فعلی محدود است", "محصول برای چند صنف تعمیراتی توسعه یافته است", "نسخه وب و اندروید فعال است"],
    };
    const prompt = buildMarketingAdvisorPrompt({ ...body, snapshot });
    const result = await runCompletion({ shopId: "platform-marketing", task: `marketing.${body.mode}`, ...prompt, responseFormat: "json", maxTokens: 1800, temperature: 0.25, maxRetries: 0 });
    if (!result.ok) return NextResponse.json({ ok: false, status: result.error?.kind || "error", message: result.error?.kind === "disabled" ? "سرویس هوش مصنوعی در تنظیمات سوپرادمین فعال نیست." : "تحلیل هوش مصنوعی در حال حاضر در دسترس نیست." });
    const analysis = parseMarketingAdvisorResult(result.text);
    if (!analysis) return NextResponse.json({ ok: false, status: "invalid_response", message: "پاسخ قابل استفاده‌ای دریافت نشد؛ دوباره تلاش کنید." });
    return NextResponse.json({ ok: true, analysis, snapshot, provider: result.provider, model: result.model, disclaimer: "این ابزار یک سامانه تصمیم‌یار داخلی بر پایه چارچوب‌های عمومی بازاریابی است؛ کلون، نماینده یا مورد تأیید اشخاص نام‌برده نیست." });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", message: "هدف و مخاطب را کامل وارد کنید." }, { status: 400 });
    console.error("[marketing-advisor]", error);
    return NextResponse.json({ error: "internal_error", message: "ساخت تحلیل ناموفق بود." }, { status: 500 });
  }
}
