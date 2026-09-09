"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { INDUSTRY_WORKSPACES, INDUSTRY_STATUS_LABELS, type IndustryKey } from "@/lib/industry-workspaces";
import { panelDate, panelNumber } from "@/lib/panel-format";
import { ClipboardList, Clock3, CheckCircle2, Wrench, RefreshCw } from "lucide-react";
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
  return <div className={`industry-dashboard industry-${industry}`}>
    <Link href={demoData ? "/industry-demo" : "/industry-workspaces"} className="industry-back">همه دسته‌بندی‌ها ←</Link>
    <div className="industry-heading"><div><h1>{config.title}</h1><p className="industry-muted">{config.description}</p></div><button disabled={loading} onClick={() => setReload(n=>n+1)}><RefreshCw size={16}/> به‌روزرسانی</button></div>
    <nav className="industry-tabs" aria-label="انتخاب داشبورد">{Object.entries(INDUSTRY_WORKSPACES).map(([key,item])=><Link key={key} aria-current={key===industry?"page":undefined} href={demoData ? `/industry-demo?industry=${key}` : `/industry-workspaces/${key}`}>{item.title}</Link>)}</nav>
    {demoData && <p className="industry-notice">تعمیرگاه نمونه پیوو — تمام مشتریان و پرونده‌های این صفحه ساختگی هستند؛ هیچ اطلاعاتی در سامانه ذخیره نمی‌شود.</p>}
    <div className="industry-links"><button aria-expanded={showIntake} onClick={() => setShowIntake(v => !v)}>{showIntake ? "بستن فرم پذیرش" : "+ پذیرش جدید"}</button>{!demoData && <><Link href="/invoices">فاکتور و تسویه</Link><Link href="/history">سوابق و مدیریت تعمیرات</Link></>}</div>
    <p className="industry-notice">فقط پرونده‌های دسته «{config.title}» در آمار محاسبه می‌شوند؛ اطلاعات موبایل و کامپیوتر وارد این نما نمی‌شود.</p>
    {notice && <p role="status" className="industry-notice">{notice}</p>}
    {showIntake && <IndustryIntake key={industry} industry={industry} demo={!!demoData} onCreated={() => { setShowIntake(false); setNotice("پذیرش ثبت شد."); setReload(n => n+1); }}/>}
    {error && <div role="alert" className="industry-error">اطلاعات دریافت نشد؛ این خطا به معنی خالی بودن پرونده‌ها نیست. دوباره به‌روزرسانی کنید.</div>}
    <section className="industry-metrics" aria-label="آمار پرونده‌ها">{cards.map(({label,value,Icon})=><article key={label}><Icon size={20}/><span>{label}</span><strong>{data?panelNumber(value,"fa"):"—"}</strong></article>)}</section>
    <div className="industry-panels">
      <section className="industry-panel"><h2>وضعیت پرونده‌ها</h2>{data ? total ? Object.entries(INDUSTRY_STATUS_LABELS).map(([status,label])=><div className="industry-bar" key={status}><div><span>{label}</span><b>{panelNumber(count(status),"fa")}</b></div><progress value={count(status)} max={total} aria-label={label}/></div>) : <p className="industry-empty">هنوز پرونده‌ای در این دسته ثبت نشده است.</p> : <p className="industry-empty">{loading?"در حال دریافت…":"اطلاعات در دسترس نیست."}</p>}</section>
      <section className="industry-panel"><h2>خدمات تحت پوشش این نما</h2><ul className="industry-specialties">{config.examples.map(item=><li key={item}>{item}</li>)}</ul><h3>اطلاعات پذیرش اختصاصی</h3><p className="industry-muted">{config.intakeNeeds}</p>{!demoData && <div className="industry-links"><Link href="/customers">دفترچه مشتریان</Link><Link href="/inventory">انبار و قطعات</Link></div>}</section>
    </div>
    <section className="industry-panel"><div className="industry-heading"><h2>آخرین پرونده‌ها</h2><input aria-label="جستجو در ۳۰ پرونده اخیر" placeholder="جستجو در ۳۰ پرونده اخیر…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="industry-table"><table><thead><tr><th>شماره</th><th>{config.assetLabel}</th><th>مشتری</th><th>وضعیت</th><th>تاریخ ثبت</th><th>عملیات</th></tr></thead><tbody>{data?.tickets.filter(t=>`${t.no} ${t.deviceModel} ${t.customer.name}`.includes(search.trim())).map(t=><tr key={t.id}><td>{panelNumber(t.no,"fa")}</td><td>{t.deviceModel}</td><td>{t.customer.name}</td><td>{INDUSTRY_STATUS_LABELS[t.status]??t.status}</td><td>{panelDate(t.createdAt,"fa")}</td><td><IndustryTicketActions key={`${t.id}-${t.status}`} ticket={t} demo={!!demoData} onChange={(message) => { if (message) setNotice(message); setReload(n => n+1); }}/>{t.status === "PENDING" && <button disabled={!!pending} onClick={() => startTicket(t.id)}>شروع کار</button>}{!demoData && <Link href={`/tickets/${t.id}/receipt`}> مشاهده رسید</Link>}</td></tr>)}</tbody></table></div>
      {data && !data.tickets.some(t=>`${t.no} ${t.deviceModel} ${t.customer.name}`.includes(search.trim())) && <p className="industry-empty">{search?"نتیجه‌ای در پرونده‌های اخیر پیدا نشد.":"پرونده‌ای برای نمایش وجود ندارد."}</p>}
    </section>
  </div>;
}
