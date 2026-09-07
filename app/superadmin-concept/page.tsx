"use client";

import { useState } from "react";
import { LayoutDashboard, Store, Users, CreditCard, MessageSquare, ShieldCheck, Settings, Search, Sun, Moon, PanelRightClose, Menu, ArrowUpLeft, ChevronLeft, Bell, Activity, Check, X } from "lucide-react";
import "./preview.css";

const groups = [
  { title: "فضای مدیریت", items: [["نمای کلی", LayoutDashboard], ["فروشگاه‌ها", Store], ["کاربران و مشتریان", Users], ["اشتراک‌ها", CreditCard]] },
  { title: "ارتباط و نظارت", items: [["پیام‌ها و کمپین‌ها", MessageSquare], ["امنیت و دسترسی", ShieldCheck], ["تنظیمات سامانه", Settings]] },
] as const;
const shops = [
  { name: "تعمیرگاه نمونه آریا", city: "تهران · موبایل و کامپیوتر", plan: "حرفه‌ای", status: "فعال", count: "۱۲۸", initial: "آ" },
  { name: "مرکز خدمات نمونه دیجیتال", city: "تبریز · موبایل", plan: "آزمایشی", status: "فعال", count: "۶۴", initial: "د" },
  { name: "رایانه نمونه پارس", city: "شیراز · کامپیوتر", plan: "تجاری", status: "فعال", count: "۹۲", initial: "پ" },
  { name: "موبایل نمونه سپهر", city: "اصفهان · موبایل", plan: "آزمایشی", status: "در انتظار تأیید", count: "۰", initial: "س" },
];

export default function SuperadminConcept() {
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [section, setSection] = useState("نمای کلی");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("همه");
  const [detail, setDetail] = useState<string | null>(null);
  const rows = shops.filter(s => (s.name + s.city).includes(query) && (filter === "همه" || s.status === filter));
  return <div className={`pc ${dark ? "pc-dark" : ""} ${collapsed ? "pc-compact" : ""}`} dir="rtl">
    {mobile && <button className="pc-overlay" aria-label="بستن منو" onClick={() => setMobile(false)} />}
    <aside className={`pc-sidebar ${mobile ? "pc-open" : ""}`}>
      <div className="pc-brand"><img src="/icons/icon-mark.png" width="35" height="35" alt="پیوو" /><strong>Peyvo<span>مدیریت پلتفرم</span></strong><button aria-label="جمع کردن منو" onClick={() => { setCollapsed(!collapsed); setMobile(false); }}><PanelRightClose size={18}/></button></div>
      <div className="pc-workspace"><span className="pc-avatar">P</span><div><b>فضای مدیریت پیوو</b><small>کنترل یکپارچه کسب‌وکار</small></div><ShieldCheck size={18}/></div>
      <nav aria-label="منوی نمونه">{groups.map(group => <div key={group.title}><p className="pc-group">{group.title}</p>{group.items.map(([name, Icon]) => <button key={name} title={name} className={section === name ? "selected" : ""} onClick={() => { setSection(name); setMobile(false); }}><Icon size={19}/><span>{name}</span>{name === "پیام‌ها و کمپین‌ها" && <em>۳</em>}</button>)}</div>)}</nav>
      <div className="pc-sidebar-foot"><ShieldCheck size={20}/><span>محیط پیش‌نمایش طراحی<small>بدون دسترسی به اطلاعات واقعی</small></span></div>
      <div className="pc-profile"><span className="pc-avatar">ب</span><div><b>مدیر نمونه</b><small>سوپرادمین پیوو</small></div><Settings size={17}/></div>
    </aside>
    <div className="pc-work">
      <header className="pc-top"><div className="pc-crumb"><button className="pc-mobile-menu" aria-label="باز کردن منو" onClick={() => setMobile(true)}><Menu size={22}/></button><span>مدیریت پلتفرم</span><ChevronLeft size={14}/><b>{section}</b></div><div className="pc-top-actions"><span className="pc-demo">نسخه نمایشی</span><button aria-label={dark ? "حالت روز" : "حالت شب"} onClick={() => setDark(!dark)}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button><button aria-label="اعلان‌های نمونه" onClick={() => setDetail("اعلان‌های نمونه: ۲ درخواست تأیید فروشگاه و ۱ پیام پشتیبانی در انتظار بررسی است.")}><Bell size={20}/></button><span className="pc-avatar">ب</span></div></header>
      <main className="pc-main">
        <div className="pc-heading"><div><p>PEYVO / ADMIN CONSOLE</p><h1>{section === "نمای کلی" ? "یک نگاه به پلتفرم" : section}</h1><span>تصویر روشن از فروشگاه‌ها، اشتراک‌ها و فعالیت سامانه</span></div><span className="pc-period">شهریور ۱۴۰۵ · داده‌های نمونه</span></div>
        <div className="pc-tabs">{["نمای کلی", "فروشگاه‌ها", "پیام‌ها و کمپین‌ها"].map(tab => <button className={section === tab ? "active" : ""} key={tab} onClick={() => setSection(tab)}>{tab}</button>)}</div>
        {section !== "نمای کلی" && section !== "فروشگاه‌ها" && <div className="pc-notice">این بخش برای نمایش ساختار منو است؛ اتصال امکانات «{section}» در مرحله اجرای طرح انجام می‌شود.</div>}
        <section className="pc-stats" aria-label="آمار نمایشی">{[
          ["فروشگاه‌های فعال", "۲۴", "۴ فروشگاه جدید", Store, "blue"],
          ["کاربران پلتفرم", "۱۸۶", "۱۲ کاربر جدید", Users, "purple"],
          ["درآمد اشتراک", "۴٫۹ میلیون", "تومان در این ماه", CreditCard, "green"],
          ["نیازمند بررسی", "۳", "۲ تأییدیه و ۱ پیام", ShieldCheck, "orange"],
        ].map(([title, value, subtitle, Icon, color]) => { const MetricIcon = Icon as typeof Store; return <article className="pc-card pc-stat" key={String(title)}><div><span>{String(title)}</span><MetricIcon size={19}/></div><strong>{String(value)}</strong><small className={`pc-${color}`}>{String(subtitle)}</small></article>; })}</section>
        <section className="pc-middle"><article className="pc-card pc-chart"><div className="pc-card-head"><div><h2>روند رشد پلتفرم</h2><p>تعداد پذیرش‌های ثبت‌شده · نمونه نمایشی</p></div><span className="pc-key"><i/> پذیرش‌ها</span></div><div className="pc-chart-summary"><strong>۱٬۲۸۴</strong><span className="pc-green"><ArrowUpLeft size={15}/> ۱۸٪ رشد نمونه</span></div><svg role="img" aria-label="نمودار نمایشی روند پذیرش ماهانه" viewBox="0 0 700 160" preserveAspectRatio="none"><defs><linearGradient id="pcFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#3b82f6" stopOpacity=".18"/><stop offset="1" stopColor="#3b82f6" stopOpacity="0"/></linearGradient></defs>{[20,60,100,140].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="currentColor" strokeDasharray="4 5"/>)}<path d="M0 125 C35 125 40 90 70 98 S115 128 145 96 S195 68 220 82 S265 111 295 68 S335 90 370 56 S415 75 445 43 S480 70 515 38 S560 61 590 29 S650 48 700 10 L700 160 L0 160 Z" fill="url(#pcFill)"/><path d="M0 125 C35 125 40 90 70 98 S115 128 145 96 S195 68 220 82 S265 111 295 68 S335 90 370 56 S415 75 445 43 S480 70 515 38 S560 61 590 29 S650 48 700 10" fill="none" stroke="#3b82f6" strokeWidth="3"/></svg><div className="pc-axis"><span>فروردین</span><span>اردیبهشت</span><span>خرداد</span><span>تیر</span><span>مرداد</span><span>شهریور</span></div></article>
        <article className="pc-card pc-health"><div className="pc-card-head"><h2>مرکز پیگیری</h2><Activity size={19}/></div><p>کارهایی که به توجه شما نیاز دارند</p>{[["تأیید فروشگاه‌ها", "۲ درخواست جدید", "orange"], ["پشتیبانی کاربران", "۱ گفت‌وگوی باز", "blue"], ["پیام‌های ارسالی", "مشاهده گزارش تحویل", "green"]].map(([title, desc, color]) => <button key={title} onClick={() => setDetail(`${title}: این ردیف صرفاً نمونه طراحی است و هنوز به داده‌های سامانه متصل نیست.`)}><span className={`pc-dot pc-${color}`}><Check size={16}/></span><span><b>{title}</b><small>{desc}</small></span><ChevronLeft size={17}/></button>)}<div className="pc-health-note">وضعیت‌ها در این صفحه صرفاً نمایشی‌اند.</div></article></section>
        <section className="pc-card pc-table-card"><div className="pc-card-head"><div><h2>فروشگاه‌های پلتفرم</h2><p>فهرست نمونه برای بررسی طراحی و خوانایی</p></div><label className="pc-search"><Search size={18}/><input aria-label="جست‌وجوی فروشگاه‌های نمونه" placeholder="جست‌وجوی فروشگاه…" value={query} onChange={e => setQuery(e.target.value)}/></label></div><div className="pc-filters">{["همه", "فعال", "در انتظار تأیید"].map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}<span>{rows.length.toLocaleString("fa-IR")} فروشگاه نمونه</span></div><div className="pc-table-scroll"><table><thead><tr><th>فروشگاه</th><th>اشتراک</th><th>وضعیت</th><th>پذیرش‌ها</th><th>جزئیات</th></tr></thead><tbody>{rows.map(s => <tr key={s.name}><td><div className="pc-shop"><span className="pc-shop-icon">{s.initial}</span><div><b>{s.name}</b><small>{s.city}</small></div></div></td><td>{s.plan}</td><td><span className={`pc-badge ${s.status === "فعال" ? "pc-green" : "pc-orange"}`}>{s.status}</span></td><td>{s.count}</td><td><button aria-label={`جزئیات ${s.name}`} onClick={() => setDetail(`${s.name} — اشتراک ${s.plan}، ${s.count} پذیرش. این فروشگاه و اطلاعات آن نمایشی است.`)}><ChevronLeft size={18}/></button></td></tr>)}</tbody></table>{rows.length === 0 && <p className="pc-empty">فروشگاهی با این مشخصات پیدا نشد.</p>}</div><div className="pc-table-foot"><span>نمایش {rows.length.toLocaleString("fa-IR")} ردیف نمونه</span><span className="pc-page-number">۱</span></div></section>
        <footer className="pc-footer"><span>پیوو · مدیریت ساده، تصمیم‌گیری دقیق</span><span>پیش‌نمایش مستقل · پنل اصلی تغییر نکرده است</span></footer>
      </main>
    </div>
    {detail && <div className="pc-modal-backdrop" onClick={() => setDetail(null)}><section className="pc-card pc-modal" role="dialog" aria-modal="true" aria-label="اطلاعات نمونه" onClick={e => e.stopPropagation()}><button aria-label="بستن" autoFocus onClick={() => setDetail(null)}><X size={21}/></button><h2>پیش‌نمایش پیوو</h2><p>{detail}</p><button className="pc-confirm" onClick={() => setDetail(null)}>متوجه شدم</button></section></div>}
  </div>;
}
