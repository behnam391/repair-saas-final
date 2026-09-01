"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3, Boxes, CircleDollarSign, Download, FileSpreadsheet,
  ReceiptText, TrendingUp, UsersRound, Wrench,
} from "lucide-react";

type Month = { label: string; repair: number; sale: number; total: number };
type Staff = { techId: string; name: string; role: string; closedCount: number; revenue: number };
type Metrics = { todayRevenue: number; todayProfit: number; weeklyProfitAverage: number; overdue: number; ready: number };

const money = (value: number) => `${Math.round(value).toLocaleString("fa-IR")} تومان`;
const ROLE: Record<string, string> = { OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تعمیرات برد" };

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [months, setMonths] = useState<Month[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [last30DaysRevenue, setLast30DaysRevenue] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let live = true;
    Promise.all([
      fetch("/api/reports/monthly-revenue", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch("/api/reports/staff", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch("/api/dashboard/insights", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
    ]).then(([monthly, team, insight]) => {
      if (!live) return;
      setMonths(monthly.months ?? []);
      setStaff((team.staff ?? []).sort((a: Staff, b: Staff) => b.revenue - a.revenue));
      setLast30DaysRevenue(team.last30DaysRevenue ?? 0);
      setMetrics(insight.metrics ?? null);
    }).catch(() => live && setFailed(true)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [status]);

  const totals = useMemo(() => months.reduce((a, m) => ({ repair: a.repair + m.repair, sale: a.sale + m.sale }), { repair: 0, sale: 0 }), [months]);
  const max = Math.max(1, ...months.map((m) => m.total));
  const points = months.map((m, i) => `${months.length <= 1 ? 50 : (i / (months.length - 1)) * 100},${92 - (m.total / max) * 78}`).join(" ");
  const totalAnnual = totals.repair + totals.sale;
  const repairPercent = totalAnnual ? Math.round((totals.repair / totalAnnual) * 100) : 0;
  const delivered = staff.reduce((sum, item) => sum + item.closedCount, 0);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (status === "loading" || loading) return <div className="report-loading"><span /><p>در حال آماده‌سازی گزارش‌های واقعی تعمیرگاه...</p></div>;
  if (role && role !== "OWNER") return <div className="report-empty"><BarChart3 size={34} /><b>گزارش‌های مالی فقط برای مدیر اصلی نمایش داده می‌شود.</b></div>;

  return (
    <main className="report-page">
      <header className="report-head">
        <div><span className="report-eyebrow"><BarChart3 size={14} /> مرکز گزارش‌های پیوو</span><h1>گزارش‌ها و تحلیل عملکرد</h1><p>تصویر شفاف درآمد، تعمیرات و عملکرد اعضای تعمیرگاه بر اساس اطلاعات ثبت‌شده</p></div>
        <div className="report-period"><span /> اطلاعات به‌روز سیستم</div>
      </header>

      {failed && <div className="report-error">دریافت بخشی از گزارش‌ها ناموفق بود. صفحه را دوباره بارگذاری کنید.</div>}

      <section className="report-kpis">
        <ReportKpi icon={<CircleDollarSign />} tone="green" label="درآمد ۳۰ روز اخیر" value={money(last30DaysRevenue)} hint="مجموع فاکتورهای ثبت‌شده" />
        <ReportKpi icon={<TrendingUp />} tone="blue" label="درآمد امروز" value={money(metrics?.todayRevenue ?? 0)} hint={`سود برآوردی: ${money(metrics?.todayProfit ?? 0)}`} />
        <ReportKpi icon={<Wrench />} tone="amber" label="تعمیرات تحویل‌شده" value={delivered.toLocaleString("fa-IR")} hint="بر اساس عملکرد اعضای تیم" />
        <ReportKpi icon={<ReceiptText />} tone="violet" label="درآمد ۱۲ ماه" value={money(totalAnnual)} hint="تعمیر و فروش مستقیم" />
      </section>

      <section className="report-main-grid">
        <article className="report-card report-revenue-card">
          <header><div><b>روند درآمد ۱۲ ماه اخیر</b><small>تعمیرات و فروش مستقیم</small></div><span><i className="is-repair" /> تعمیرات <i className="is-sale" /> فروش</span></header>
          {months.some((m) => m.total > 0) ? <div className="report-line-chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="نمودار درآمد"><defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--rgb-teal))" stopOpacity=".28"/><stop offset="1" stopColor="rgb(var(--rgb-teal))" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} /><polyline points={points} /></svg>
            <div>{months.map((m) => <small key={m.label}>{m.label}</small>)}</div>
          </div> : <Empty text="هنوز فاکتوری برای رسم نمودار ثبت نشده است." />}
        </article>

        <article className="report-card report-split-card">
          <header><div><b>ترکیب درآمد</b><small>سهم خدمات و فروش در ۱۲ ماه</small></div></header>
          <div className="report-split-body">
            <div className="report-donut" style={{ background: totalAnnual ? `conic-gradient(rgb(var(--rgb-copper)) 0 ${repairPercent}%, rgb(var(--rgb-teal)) ${repairPercent}% 100%)` : "var(--color-surface2)" }}><span><b>{repairPercent.toLocaleString("fa-IR")}٪</b><small>تعمیرات</small></span></div>
            <div className="report-split-legend"><span><i className="is-repair" /><em>درآمد تعمیرات</em><b>{money(totals.repair)}</b></span><span><i className="is-sale" /><em>فروش مستقیم</em><b>{money(totals.sale)}</b></span></div>
          </div>
        </article>
      </section>

      <section className="report-bottom-grid">
        <article className="report-card report-staff-card">
          <header><div><b>عملکرد اعضای تیم</b><small>مرتب‌شده بر اساس درآمد تعمیرات تحویل‌شده</small></div><UsersRound size={18} /></header>
          {staff.length ? <div className="report-table"><div className="report-table-row is-head"><span>همکار</span><span>نقش</span><span>تحویل‌شده</span><span>درآمد</span></div>{staff.map((item, index) => <div className="report-table-row" key={item.techId}><span><i>{(index + 1).toLocaleString("fa-IR")}</i><b>{item.name}</b></span><span>{ROLE[item.role] ?? item.role}</span><span>{item.closedCount.toLocaleString("fa-IR")}</span><span>{money(item.revenue)}</span></div>)}</div> : <Empty text="هنوز عملکردی برای اعضای تیم ثبت نشده است." />}
        </article>

        <article className="report-card report-export-card">
          <header><div><b>دریافت خروجی</b><small>برای حسابداری و بایگانی</small></div><Download size={18} /></header>
          <div className="report-exports">
            <ExportLink href="/api/reports/export?type=invoices" icon={<ReceiptText />} title="گزارش فاکتورها" />
            <ExportLink href="/api/reports/export?type=tickets" icon={<Wrench />} title="گزارش تعمیرات" />
            <ExportLink href="/api/reports/export?type=inventory" icon={<Boxes />} title="گزارش انبار" />
          </div>
          <p><FileSpreadsheet size={14} /> فایل‌ها با فرمت مناسب اکسل دریافت می‌شوند.</p>
        </article>
      </section>
    </main>
  );
}

function ReportKpi({ icon, tone, label, value, hint }: { icon: React.ReactNode; tone: string; label: string; value: string; hint: string }) {
  return <article className="report-kpi"><span className={`is-${tone}`}>{icon}</span><div><small>{label}</small><b>{value}</b><p>{hint}</p></div></article>;
}
function Empty({ text }: { text: string }) { return <div className="report-empty"><BarChart3 size={26} /><span>{text}</span></div>; }
function ExportLink({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) { return <a href={href}><span>{icon}</span><b>{title}</b><Download size={15} /></a>; }
