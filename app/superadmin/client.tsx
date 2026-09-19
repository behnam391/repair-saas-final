"use client";
import { useEffect, useMemo, useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";
import { useToast } from "@/components/ToastProvider";
import type { LucideIcon } from "lucide-react";
import { Activity, BadgeCheck, BriefcaseBusiness, ChevronLeft, ChevronRight, CircleDollarSign, Gift, Headphones, MoreVertical, Search, ShieldCheck, Store, TrendingUp } from "lucide-react";

const PLAN_LABEL: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", business: "تجاری" };
const CATEGORY_OPTIONS = [
  ["MOBILE", "تعمیرات موبایل"], ["COMPUTER", "تعمیرات کامپیوتر"],
  ["APPLIANCE", "تعمیرات لوازم خانگی"], ["FACILITIES", "تأسیسات گرمایشی و سرمایشی"],
  ["VEHICLE", "خودرو و موتورسیکلت"], ["INDUSTRIAL", "تجهیزات برقی و صنعتی"],
] as const;

// Grouped superadmin navigation. Grouping + wrapping keeps the many
// destinations tidy and inside the box, instead of one long scrolling row.
type ShopRow = {
  id: string; name: string; plan: string; active: boolean; isTest: boolean; supportAccessEnabled: boolean; planExpiresAt: string | null;
  userCount: number; ticketCount: number; totalPaid: number; createdAt: string; serviceCategories: string;
};

export default function SuperAdminClient() {
  const { showToast } = useToast();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function load() {
    setLoading(true);
    const res = await fetch("/api/superadmin/shops");
    if (res.ok) {
      const data = await res.json();
      setShops(data.shops ?? []);
      setTotalRevenue(data.totalRevenue ?? 0);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/superadmin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    showToast(res.ok ? { title: current ? "فروشگاه تعلیق شد" : "فروشگاه فعال شد", type: "success" } : { title: "تغییر وضعیت انجام نشد", type: "error" });
    load();
  }

  async function toggleSupportAccess(id: string, current: boolean) {
    const res = await fetch(`/api/superadmin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supportAccessEnabled: !current }),
    });
    showToast(res.ok ? { title: "دسترسی پشتیبانی به‌روزرسانی شد", type: "success" } : { title: "به‌روزرسانی ناموفق بود", type: "error" });
    load();
  }

  const [giftShop, setGiftShop] = useState<ShopRow | null>(null);
  async function grantGift(id: string, grantPlan: string, grantMonths: number) {
    const res = await fetch(`/api/superadmin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantPlan, grantMonths }),
    });
    showToast(res.ok ? { title: "اشتراک هدیه اعمال شد", message: "مدت جدید به حساب فروشگاه اضافه شد.", type: "success" } : { title: "اعطای اشتراک ناموفق بود", type: "error" });
    setGiftShop(null);
    load();
  }

  const [categoryShop, setCategoryShop] = useState<ShopRow | null>(null);
  async function updateCategories(id: string, serviceCategories: string[]) {
    const res = await fetch(`/api/superadmin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceCategories }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast({ title: "اصلاح دسته شغلی انجام نشد", message: data.message, type: "error" });
      return;
    }
    showToast({
      title: "دسته شغلی اصلاح شد",
      message: data.notified ? `اعلان تغییر برای ${data.notified.toLocaleString("fa-IR")} مدیر فروشگاه ارسال شد.` : "تغییر ذخیره شد؛ مدیر فعالی برای دریافت اعلان وجود نداشت.",
      type: "success",
    });
    setCategoryShop(null);
    load();
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function deleteShop(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/superadmin/shops/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDelete(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); showToast({ title: "حذف ناموفق بود", message: d.message, type: "error" }); return; }
    showToast({ title: "فروشگاه حذف شد", message: "تمام داده‌های وابسته پاک شدند.", type: "warning" });
    load();
  }

  const filtered = useMemo(() => {
    return shops.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = !planFilter || s.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [shops, search, planFilter]);

  const activeCount = shops.filter((s) => s.active).length;
  const paidCount = shops.filter((s) => s.plan !== "free").length;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const planStats = ["free", "pro", "business"].map(plan => ({ plan, count: shops.filter(s => s.plan === plan).length }));
  const recentMonths = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d; });
  const growth = recentMonths.map(date => ({ label: new Intl.DateTimeFormat("fa-IR", { month: "short" }).format(date), count: shops.filter(s => { const d = new Date(s.createdAt); return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth(); }).length }));
  const maxGrowth = Math.max(1, ...growth.map(x => x.count));

  useEffect(() => { setPage(1); }, [search, planFilter]);

  return (
    <>
<header className="pc-heading"><div><p>PEYVO / ADMIN CONSOLE</p><h1>یک نگاه به پلتفرم</h1><span>فروشگاه‌ها، اشتراک‌ها و فعالیت سامانه</span></div></header><div className="pc-tabs"><a href="#shops">فروشگاه‌های پلتفرم</a></div>

        <section className="super-kpis">
          <SuperKpi icon={Store} label="کل فروشگاه‌ها" value={shops.length.toLocaleString("fa-IR")} hint={`${activeCount.toLocaleString("fa-IR")} فروشگاه فعال`} tone="blue" />
          <SuperKpi icon={Activity} label="نرخ فعالیت" value={`${shops.length ? Math.round(activeCount / shops.length * 100) : 0}٪`} hint="سهم فروشگاه‌های فعال" tone="green" />
          <SuperKpi icon={BadgeCheck} label="اشتراک‌های ارتقایافته" value={paidCount.toLocaleString("fa-IR")} hint="شامل اشتراک هدیه" tone="violet" />
          <SuperKpi icon={CircleDollarSign} label="درآمد اشتراک" value={totalRevenue.toLocaleString("fa-IR")} hint="تومان · مجموع پرداخت" tone="amber" />
        </section>

        <section className="super-charts">
          <div className="super-chart-card"><div className="super-chart-title"><span><TrendingUp size={17} /></span><div><b>رشد فروشگاه‌ها</b><small>ثبت‌نام شش ماه اخیر</small></div></div><div className="super-bars">{growth.map((item) => <div key={item.label}><span title={`${item.count} فروشگاه`} style={{ height: `${Math.max(8, item.count / maxGrowth * 100)}%` }}><i>{item.count.toLocaleString("fa-IR")}</i></span><small>{item.label}</small></div>)}</div></div>
          <div className="super-chart-card"><div className="super-chart-title"><span><BadgeCheck size={17} /></span><div><b>ترکیب اشتراک‌ها</b><small>سهم هر پلن از شبکه</small></div></div><div className="super-plan-chart"><div className="super-donut" style={{ background: `conic-gradient(#2dd4bf 0 ${shops.length ? planStats[0].count / shops.length * 100 : 100}%, #609cff 0 ${shops.length ? (planStats[0].count + planStats[1].count) / shops.length * 100 : 100}%, #a997ff 0)` }}><span>{shops.length.toLocaleString("fa-IR")}</span></div><div>{planStats.map((x, i) => <p key={x.plan}><i className={`dot-${i}`} /><span>{PLAN_LABEL[x.plan]}</span><b>{x.count.toLocaleString("fa-IR")}</b></p>)}</div></div></div>
        </section>

        <section id="shops" className="super-panel">
          <div className="super-panel-head"><div><h2>مدیریت فروشگاه‌ها</h2><p>{filtered.length.toLocaleString("fa-IR")} نتیجه از {shops.length.toLocaleString("fa-IR")} فروشگاه</p></div><div className="super-filter"><Search size={16} /><input placeholder="جستجوی نام فروشگاه..." value={search} onChange={(e) => setSearch(e.target.value)} /><select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}><option value="">همه پلن‌ها</option><option value="free">رایگان</option><option value="pro">حرفه‌ای</option><option value="business">تجاری</option></select></div></div>

          {loading ? <div className="super-loading">{[1,2,3].map((i) => <i key={i} className="skeleton" />)}</div> : filtered.length === 0 ? <div className="empty-state">فروشگاهی با این مشخصات پیدا نشد.</div> : <><div className="pc-table-scroll"><table><thead><tr><th>فروشگاه</th><th>اشتراک / انقضا</th><th>وضعیت</th><th>کاربر / پذیرش</th><th>پرداختی (تومان)</th><th>عملیات</th></tr></thead><tbody>
{visible.map(s => <tr key={s.id}><td><div className="pc-shop"><span className="pc-shop-icon"><Store size={18}/></span><div><b>{s.name}{s.isTest && <span className="pc-badge pc-orange mr-2">آزمایشی</span>}</b><small>{s.serviceCategories.split(",").map(key => CATEGORY_OPTIONS.find(x => x[0] === key)?.[1]).filter(Boolean).join("، ")}</small><small>عضویت از {formatJalaliDate(s.createdAt)}</small></div></div></td><td>{PLAN_LABEL[s.plan] ?? s.plan}<small>{s.planExpiresAt ? formatJalaliDate(s.planExpiresAt) : "—"}</small></td><td><span className={s.active ? "pc-badge pc-green" : "pc-badge pc-orange"}>{s.active ? "فعال" : "معلق"}</span></td><td>{s.userCount.toLocaleString("fa-IR")} / {s.ticketCount.toLocaleString("fa-IR")}</td><td>{s.totalPaid.toLocaleString("fa-IR")}</td><td><details className="pc-row-actions"><summary>مدیریت فروشگاه</summary><div><button onClick={() => toggleActive(s.id,s.active)}>{s.active ? "تعلیق فروشگاه" : "فعال‌سازی فروشگاه"}</button><button onClick={() => toggleSupportAccess(s.id,s.supportAccessEnabled)}>{s.supportAccessEnabled ? "قطع دسترسی پشتیبانی" : "فعال‌سازی دسترسی پشتیبانی"}</button><button onClick={() => setCategoryShop(s)}>اصلاح دسته شغلی و اعلان</button><button onClick={() => setGiftShop(s)}>هدیه اشتراک</button>{confirmDelete === s.id ? <div className="super-delete-confirm"><p>«{s.name}» و تمام داده‌هایش برای همیشه حذف شود؟</p><button onClick={() => deleteShop(s.id)} disabled={deletingId === s.id}>{deletingId === s.id ? "در حال حذف…" : "حذف قطعی"}</button><button onClick={() => setConfirmDelete(null)}>انصراف</button></div> : <button className="pc-danger" onClick={() => setConfirmDelete(s.id)}>حذف کامل فروشگاه</button>}</div></details></td></tr>)}
</tbody></table></div><div className="super-pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={15} /> قبلی</button><span>صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span><button disabled={page === pages} onClick={() => setPage(p => p + 1)}>بعدی <ChevronLeft size={15} /></button></div></>}
        </section>

      {giftShop && (
        <div className="ticket-modal-backdrop" onClick={() => setGiftShop(null)}>
          <GiftModal shop={giftShop} onClose={() => setGiftShop(null)} onGrant={grantGift} />
        </div>
      )}
      {categoryShop && (
        <div className="ticket-modal-backdrop" onClick={() => setCategoryShop(null)}>
          <CategoryModal shop={categoryShop} onClose={() => setCategoryShop(null)} onSave={updateCategories} />
        </div>
      )}
    </>
  );
}

function CategoryModal({ shop, onClose, onSave }: { shop: ShopRow; onClose: () => void; onSave: (id: string, categories: string[]) => Promise<void> }) {
  const [selected, setSelected] = useState(() => shop.serviceCategories.split(",").filter(Boolean));
  const [saving, setSaving] = useState(false);
  const toggle = (key: string) => setSelected(current => current.includes(key) ? (current.length > 1 ? current.filter(item => item !== key) : current) : [...current, key]);
  return <div className="bg-surface border border-surface2 rounded-2xl p-5 w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
    <div className="flex items-center gap-2 mb-1"><BriefcaseBusiness size={19}/><div className="font-bold text-sm">اصلاح دسته شغلی</div></div>
    <p className="text-[12px] text-muted mb-4">دسته درست «{shop.name}» را انتخاب کنید. با ذخیره، داشبورد متناسب فعال و اعلان تغییر برای مدیران فروشگاه ارسال می‌شود.</p>
    <div className="grid sm:grid-cols-2 gap-2 mb-4">
      {CATEGORY_OPTIONS.map(([key, label]) => <label key={key} className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer ${selected.includes(key) ? "border-blue-500 bg-blue-500/10" : "border-border bg-surface2"}`}>
        <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />
        <span className="text-sm font-semibold">{label}</span>
      </label>)}
    </div>
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-muted mb-4">پرونده‌های قبلی حذف نمی‌شوند؛ فقط فضای کاری، پذیرش و داشبورد پیش‌فرض فروشگاه مطابق دسته جدید تنظیم می‌شود.</div>
    <div className="flex gap-2">
      <button disabled={saving || !selected.length} onClick={async () => { setSaving(true); await onSave(shop.id, selected); setSaving(false); }} className="flex-[2] bg-blue-600 text-white font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">{saving ? "در حال ذخیره…" : "ذخیره و ارسال اعلان"}</button>
      <button onClick={onClose} className="flex-1 bg-surface2 border border-border rounded-lg py-2.5 text-sm">انصراف</button>
    </div>
  </div>;
}

function SuperKpi({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint: string; tone: string }) {
  return <div className={`super-kpi is-${tone}`}><span><Icon size={20} /></span><div><small>{label}</small><b>{value}</b><p>{hint}</p></div></div>;
}

function GiftModal({ shop, onClose, onGrant }: { shop: ShopRow; onClose: () => void; onGrant: (id: string, plan: string, months: number) => void }) {
  const [plan, setPlan] = useState("pro");
  const [months, setMonths] = useState(1);
  return (
    <div className="bg-surface border border-surface2 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
      <div className="font-bold text-sm mb-1">هدیه اشتراک رایگان</div>
      <p className="text-[11px] text-muted mb-4">به «{shop.name}» یک اشتراک رایگان می‌دهید (بدون پرداخت). مدت به اشتراک فعلی اضافه می‌شود.</p>
      <label className="block text-[11px] text-muted mb-1">پلن</label>
      <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3" value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option value="pro">حرفه‌ای</option>
        <option value="business">تجاری</option>
        <option value="free">بازگشت به رایگان</option>
      </select>
      {plan !== "free" && (
        <>
          <label className="block text-[11px] text-muted mb-1">مدت</label>
          <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-4" value={months} onChange={(e) => setMonths(+e.target.value)}>
            {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} ماه</option>)}
          </select>
        </>
      )}
      <div className="flex gap-2">
        <button onClick={() => onGrant(shop.id, plan, months)} className="flex-[2] bg-teal text-white font-bold rounded-lg py-2.5 text-sm">
          {plan === "free" ? "بازگرداندن به پلن رایگان" : "اعطای اشتراک رایگان"}
        </button>
        <button onClick={onClose} className="flex-1 bg-surface2 border border-border rounded-lg py-2.5 text-sm">انصراف</button>
      </div>
    </div>
  );
}
