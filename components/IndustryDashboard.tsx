"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { INDUSTRY_WORKSPACES, INDUSTRY_STATUS_LABELS, type IndustryKey } from "@/lib/industry-workspaces";
import { panelDate, panelNumber } from "@/lib/panel-format";
import { AirVent, BarChart3, Boxes, CarFront, CheckCircle2, ClipboardList, Clock3, Factory, FileText, Plus, ReceiptText, Refrigerator, RefreshCw, Store, UsersRound, Wrench } from "lucide-react";
import IndustryIntake from "./IndustryIntake";
import IndustryTicketActions from "./IndustryTicketActions";
type Data = { counts: Record<string, number>; tickets: { id: string; no: number; deviceModel: string; status: string; createdAt: string; customer: { name: string } }[] };
export default function IndustryDashboard({ industry, demoData }: { industry: IndustryKey; demoData?: Data }) {
  const config = INDUSTRY_WORKSPACES[industry];
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [showIntake, setShowIntake] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  async function startTicket(id: string) {
    if (demoData) { setNotice("در نمونه نمایشی وضعیت پرونده تغییر نمی‌کند."); return; }
    setPending(id); setNotice("");
    try {
      const response = await fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || "تغییر وضعیت انجام نشد");
      setReload(n => n+1);
    } catch (e) { setNotice(e instanceof Error ? e.message : "خطای ارتباط"); }
    finally { setPending(null); }
  }
  useEffect(() => {
    if (demoData) { setData(demoData); setLoading(false); setError(false); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setLoading(true); setError(false); setData(null);
    fetch(`/api/industry-workspaces/${industry}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error();
      const result = await response.json();
      if (active) setData(result);
    }).catch(() => { if (active) setError(true); }).finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [industry, reload, demoData]);
  const count = (status: string) => data?.counts[status] ?? 0;
  const total = data ? Object.values(data.counts).reduce((a,b) => a+b,0) : 0;
  const open = total - count("DELIVERED") - count("CANCELLED");
  const cards = [
    { label: "پرونده‌های باز", value: open, Icon: ClipboardList },
    { label: config.focus, value: count(config.focusStatus), Icon: Clock3 },
    { label: "در حال انجام", value: count("IN_PROGRESS"), Icon: Wrench },
    { label: "تحویل‌شده", value: count("DELIVERED"), Icon: CheckCircle2 },
  ];
  const IndustryIcon = industry === "appliances" ? Refrigerator : industry === "facilities" ? AirVent : industry === "vehicles" ? CarFront : Factory;
  const quickLinks = [
    { href: "/customers", label: "مشتری جدید", Icon: UsersRound },
    { href: "/inventory", label: "ورود قطعه", Icon: Boxes },
    { href: "/invoices", label: "فاکتور جدید", Icon: ReceiptText },
    { href: "/market", label: "بازار سراسری", Icon: Store },
  ];
  const activeTickets = data?.tickets.filter(ticket => !["DELIVERED", "CANCELLED"].includes(ticket.status)) ?? [];
  return <div className={`industry-dashboard industry-${industry}`}>
    <header className="industry-hero"><div className="industry-hero-icon"><IndustryIcon size={28}/></div><div><small>{config.group}</small><h1>{config.title}</h1><p>{config.description}</p></div><div className="industry-hero-actions"><button className="industry-primary" aria-expanded={showIntake} onClick={() => setShowIntake(v => !v)}><Plus size={17}/>{showIntake ? "بستن پذیرش" : "پذیرش جدید"}</button><button aria-label="به‌روزرسانی" disabled={loading} onClick={() => setReload(n=>n+1)}><RefreshCw size={16}/></button></div></header>
    {demoData && <p className="industry-notice">تعمیرگاه نمونه پیوو — تمام مشتریان و پرونده‌های این صفحه ساختگی هستند؛ هیچ اطلاعاتی در سامانه ذخیره نمی‌شود.</p>}
    {notice && <p role="status" className="industry-notice">{notice}</p>}
    {showIntake && <IndustryIntake key={industry} industry={industry} demo={!!demoData} onCreated={() => { setShowIntake(false); setNotice("پذیرش ثبت شد."); setReload(n => n+1); }}/>}
    {error && <div role="alert" className="industry-error">اطلاعات دریافت نشد؛ این خطا به معنی خالی بودن پرونده‌ها نیست. دوباره به‌روزرسانی کنید.</div>}
    <section className="industry-metrics" aria-label="آمار پرونده‌ها">{cards.map(({label,value,Icon})=><article key={label}><Icon size={20}/><span>{label}</span><strong>{data?panelNumber(value,"fa"):"—"}</strong></article>)}</section>
    <div className="industry-overview">
      <section className="industry-panel industry-performance"><div className="industry-section-title"><span><BarChart3 size={18}/></span><div><h2>نمای عملکرد تعمیرگاه</h2><p>توزیع زنده پرونده‌های این صنف</p></div></div>{data ? total ? <div className="industry-status-visual"><div className="industry-donut" style={{background:`conic-gradient(var(--iw-accent) 0 ${Math.round(count("IN_PROGRESS")/total*100)}%, #32c787 0 ${Math.round((count("IN_PROGRESS")+count("READY"))/total*100)}%, #f1ad3c 0 ${Math.round((count("IN_PROGRESS")+count("READY")+count("AWAITING_APPROVAL"))/total*100)}%, var(--iw-line) 0)`}}><span><b>{panelNumber(open,"fa")}</b><small>فعال</small></span></div><div className="industry-status-bars">{Object.entries(INDUSTRY_STATUS_LABELS).filter(([status]) => count(status)>0).map(([status,label])=><div className="industry-bar" key={status}><div><span>{label}</span><b>{panelNumber(count(status),"fa")}</b></div><progress value={count(status)} max={total} aria-label={label}/></div>)}</div></div> : <p className="industry-empty">هنوز پرونده‌ای در این دسته ثبت نشده است.</p> : <p className="industry-empty">{loading?"در حال دریافت…":"اطلاعات در دسترس نیست."}</p>}</section>
      <aside className="industry-daily"><section className="industry-panel"><div className="industry-section-title"><span><Clock3 size={18}/></span><div><h2>داشبورد روزانه</h2><p>کارهای نیازمند پیگیری</p></div></div><div className="industry-daily-row"><span>{config.focus}</span><strong>{panelNumber(count(config.focusStatus),"fa")}</strong></div><div className="industry-daily-row"><span>پرونده‌های باز</span><strong>{panelNumber(open,"fa")}</strong></div></section>{!demoData && <section className="industry-panel"><h2>میانبرهای سریع</h2><div className="industry-quick-links">{quickLinks.map(({href,label,Icon})=><Link key={href} href={href}><Icon size={17}/><span>{label}</span></Link>)}</div></section>}</aside>
    </div>
    <section className="industry-panel industry-active"><div className="industry-heading"><div><h2>تعمیرات فعال</h2><p className="industry-muted">آخرین پذیرش‌های در جریان · {panelNumber(activeTickets.length,"fa")} مورد</p></div><div className="industry-search"><FileText size={16}/><input aria-label="جستجو در ۳۰ پرونده اخیر" placeholder="شماره، دستگاه یا مشتری…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
      <div className="industry-table"><table><thead><tr><th>شماره</th><th>{config.assetLabel}</th><th>مشتری</th><th>وضعیت</th><th>تاریخ ثبت</th><th>عملیات</th></tr></thead><tbody>{data?.tickets.filter(t=>`${t.no} ${t.deviceModel} ${t.customer.name}`.includes(search.trim())).map(t=><tr key={t.id}><td>{panelNumber(t.no,"fa")}</td><td>{t.deviceModel}</td><td>{t.customer.name}</td><td>{INDUSTRY_STATUS_LABELS[t.status]??t.status}</td><td>{panelDate(t.createdAt,"fa")}</td><td><IndustryTicketActions key={`${t.id}-${t.status}`} ticket={t} demo={!!demoData} onChange={(message) => { if (message) setNotice(message); setReload(n => n+1); }}/>{t.status === "PENDING" && <button disabled={!!pending} onClick={() => startTicket(t.id)}>شروع کار</button>}{!demoData && <Link href={`/tickets/${t.id}/receipt`}> مشاهده رسید</Link>}</td></tr>)}</tbody></table></div>
      {data && !data.tickets.some(t=>`${t.no} ${t.deviceModel} ${t.customer.name}`.includes(search.trim())) && <p className="industry-empty">{search?"نتیجه‌ای در پرونده‌های اخیر پیدا نشد.":"پرونده‌ای برای نمایش وجود ندارد."}</p>}
    </section>
    <section className="industry-panel industry-scope"><div><h2>خدمات این فضای کاری</h2><ul className="industry-specialties">{config.examples.map(item=><li key={item}>{item}</li>)}</ul></div><div><h2>پذیرش متناسب با صنف</h2><p className="industry-muted">{config.intakeNeeds}</p>{!demoData && <div className="industry-links"><Link href="/history">سوابق تعمیرات</Link><Link href="/reports">گزارش‌ها</Link></div>}</div></section>
  </div>;
}
