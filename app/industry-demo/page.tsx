import { notFound } from "next/navigation";
import Link from "next/link";
import IndustryDashboard from "@/components/IndustryDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { isIndustryKey } from "@/lib/industry-workspaces";
import "../industry-workspaces/workspace.css";

export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: { industry?: string } }) {
  // A local-only fixture, never a bypass for authenticated shop dashboards.
  if (process.env.NODE_ENV !== "development") notFound();
  const industry = searchParams.industry ?? "appliances";
  if (!isIndustryKey(industry)) notFound();
  const models = {
    appliances: ["لباسشویی بوش — تخلیه نشدن آب", "یخچال سامسونگ — افت سرمایش", "ظرفشویی ال‌جی — نشتی آب", "جاروبرقی پارس‌خزر — تعویض موتور", "مایکروویو پاناسونیک — گرم نکردن"],
    facilities: ["پکیج ایران‌رادیاتور — افت فشار", "کولر گازی گری — سرویس دوره‌ای", "آبگرمکن بوتان — روشن نشدن", "کولر آبی — تعویض پمپ", "سردخانه — بررسی کمپرسور"],
    vehicles: ["پژو ۲۰۶ — سرویس ترمز", "موتورسیکلت هوندا — تنظیم موتور", "سمند — بررسی برق", "تیبا — تعویض کلاچ", "اسکوتر — سرویس دوره‌ای"],
    industrial: ["الکتروموتور سه‌فاز — سیم‌پیچی", "پمپ صنعتی — تعویض سیل", "دریل بوش — تعویض زغال", "اینورتر — بررسی برد", "کمپرسور — سرویس دوره‌ای"],
  }[industry];
  const statuses = ["IN_PROGRESS", "AWAITING_APPROVAL", "PENDING", "READY", "DELIVERED"];
  const tickets = models.map((deviceModel, i) => ({ id: `demo-${industry}-${i}`, no: 1201+i, deviceModel, status: statuses[i], createdAt: "2026-09-09T08:00:00Z", customer: { name: `مشتری نمونه ${i+1}` } }));
  const counts = Object.fromEntries(statuses.map(status => [status, tickets.filter(t => t.status === status).length]));
  return <div className="industry-shell" dir="rtl"><header className="industry-top"><Link href="/industry-demo"><b>پیوو</b> · تعمیرگاه نمونه</Link><div><span>محیط نمایشی محلی · بدون ثبت اطلاعات واقعی</span><ThemeToggle /></div></header><main><IndustryDashboard industry={industry} demoData={{ counts, tickets }} /></main></div>;
}
