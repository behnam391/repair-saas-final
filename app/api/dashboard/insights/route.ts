import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId, role } = await requireSession();
    if (role !== "OWNER") return NextResponse.json({ insights: [] });

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const [overdue, lowStock, unreadCustomers, ready, todayInvoices, weekInvoices] = await Promise.all([
      db.ticket.count({ where: { shopId, createdAt: { lt: threeDaysAgo }, status: { notIn: ["READY", "DELIVERED", "CANCELLED"] } } }),
      db.inventoryItem.findMany({ where: { shopId, condition: "WORKING", quantity: { lte: 2 } }, orderBy: { quantity: "asc" }, take: 1, select: { name: true, quantity: true } }),
      db.ticketMessage.count({ where: { ticket: { shopId }, fromCustomer: true, readByShop: false } }),
      db.ticket.count({ where: { shopId, status: "READY" } }),
      db.invoice.aggregate({ where: { shopId, createdAt: { gte: today } }, _sum: { total: true, technicianWage: true, partsCost: true } }),
      db.invoice.aggregate({ where: { shopId, createdAt: { gte: weekAgo, lt: today } }, _sum: { total: true, technicianWage: true, partsCost: true } }),
    ]);

    const profit = (x: typeof todayInvoices) => (x._sum.total ?? 0) - (x._sum.technicianWage ?? 0) - (x._sum.partsCost ?? 0);
    const todayProfit = profit(todayInvoices);
    const dailyAverage = Math.round(profit(weekInvoices) / 7);
    const delta = dailyAverage > 0 ? Math.round(((todayProfit - dailyAverage) / dailyAverage) * 100) : 0;

    const insights = [
      overdue > 0 && { tone: "red", icon: "clock", title: `${overdue.toLocaleString("fa-IR")} دستگاه از زمان معمول تعمیر عبور کرده‌اند`, detail: "نیازمند پیگیری سریع" },
      lowStock[0] && { tone: "orange", icon: "stock", title: `موجودی «${lowStock[0].name}» رو به پایان است`, detail: `${lowStock[0].quantity.toLocaleString("fa-IR")} عدد باقی مانده` },
      unreadCustomers > 0 && { tone: "yellow", icon: "message", title: `${unreadCustomers.toLocaleString("fa-IR")} پیام مشتری منتظر پاسخ است`, detail: "مرکز پیام‌ها را بررسی کنید" },
      { tone: delta < 0 ? "red" : "green", icon: "profit", title: `سود امروز ${Math.abs(delta).toLocaleString("fa-IR")}٪ ${delta < 0 ? "کمتر" : "بیشتر"} از میانگین هفته است`, detail: `${todayProfit.toLocaleString("fa-IR")} تومان سود برآوردی` },
      ready > 0 && { tone: "blue", icon: "star", title: `${ready.toLocaleString("fa-IR")} دستگاه آماده تحویل است`, detail: "اطلاع‌رسانی و تسویه را تکمیل کنید" },
    ].filter(Boolean);

    return NextResponse.json({
      insights,
      metrics: {
        todayRevenue: todayInvoices._sum.total ?? 0,
        todayProfit,
        weeklyProfitAverage: dailyAverage,
        overdue,
        ready,
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[dashboard/insights]", e);
    return NextResponse.json({ insights: [] });
  }
}
