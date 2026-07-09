"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی",
};

type Staff = { id: string; name: string; phone: string; role: string; active: boolean };
type ReportRow = { techId: string; name: string; role: string; closedCount: number; revenue: number };
type ShopInfo = { name: string; address: string | null; phone: string | null; plan: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "HARDWARE" });
  const [error, setError] = useState("");

  const [shopInfo, setShopInfo] = useState<ShopInfo>({ name: "", address: "", phone: "", plan: "free" });
  const [shopSaved, setShopSaved] = useState(false);

  const isOwner = (session?.user as any)?.role === "OWNER";

  async function load() {
    const [sRes, rRes, shopRes] = await Promise.all([
      fetch("/api/staff"), fetch("/api/reports/staff"), fetch("/api/shop"),
    ]);
    if (sRes.ok) setStaff((await sRes.json()).staff ?? []);
    if (rRes.ok) {
      const data = await rRes.json();
      setReport(data.staff ?? []);
      setMonthRevenue(data.last30DaysRevenue ?? 0);
    }
    if (shopRes.ok) {
      const data = await shopRes.json();
      setShopInfo({ name: data.shop.name, address: data.shop.address ?? "", phone: data.shop.phone ?? "", plan: data.shop.plan });
    }
  }
  useEffect(() => { if (isOwner) load(); }, [isOwner]);

  async function addStaff() {
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "افزودن کارمند ناموفق بود");
      return;
    }
    setForm({ name: "", phone: "", password: "", role: "HARDWARE" });
    load();
  }

  async function saveShopInfo() {
    setShopSaved(false);
    const res = await fetch("/api/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: shopInfo.name, address: shopInfo.address, phone: shopInfo.phone }),
    });
    if (res.ok) {
      setShopSaved(true);
      setTimeout(() => setShopSaved(false), 2500);
    }
  }

  if (status === "loading") return <p className="p-4 text-sm text-muted">در حال بارگذاری...</p>;
  if (!isOwner) {
    return <p className="p-4 text-sm text-muted">این بخش فقط برای مدیر مغازه قابل دسترسی است.</p>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="font-extrabold mb-4 text-lg">پنل مدیریت</h1>

      <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4 mb-6 shadow-lg shadow-black/20">
        <div className="text-xs text-muted mb-1">درآمد ۳۰ روز اخیر</div>
        <div className="text-2xl font-extrabold mono text-copper">{monthRevenue.toLocaleString("fa-IR")} <span className="text-xs font-normal text-ink">تومان</span></div>
      </div>

      {/* Shop info / address settings */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">اطلاعات مغازه</div>
        <label className="block text-xs text-muted mb-1">نام مغازه</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={shopInfo.name} onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })} />
        <label className="block text-xs text-muted mb-1">آدرس</label>
        <textarea className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="آدرس کامل مغازه برای نمایش به مشتریان"
          value={shopInfo.address ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })} />
        <label className="block text-xs text-muted mb-1">تلفن مغازه</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={shopInfo.phone ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })} />
        <button onClick={saveShopInfo} className="w-full bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors font-bold rounded-lg py-2.5 text-sm">
          {shopSaved ? "✅ ذخیره شد" : "ذخیره تغییرات"}
        </button>
      </div>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">افزودن کارمند جدید</div>
        <input placeholder="نام" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="شماره موبایل" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="رمز عبور موقت" type="password" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        {error && <p className="text-danger text-xs mb-2">{error}</p>}
        <button onClick={addStaff} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm hover:brightness-110 transition">
          افزودن کارمند
        </button>
      </div>

      <div className="text-sm font-bold mb-2">اعضای تیم</div>
      <div className="space-y-2 mb-6">
        {staff.map((s) => (
          <div key={s.id} className="flex justify-between bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs">
            <span>{s.name} · {s.phone}</span>
            <span className="text-muted">{ROLE_LABEL[s.role] ?? s.role}</span>
          </div>
        ))}
      </div>

      <div className="text-sm font-bold mb-2">گزارش بهره‌وری (دستگاه‌های تحویل‌شده)</div>
      <div className="space-y-2">
        {report.map((r) => (
          <div key={r.techId} className="flex justify-between bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs">
            <span>{r.name} · {ROLE_LABEL[r.role] ?? r.role}</span>
            <span className="mono">{r.closedCount} دستگاه · {r.revenue.toLocaleString("fa-IR")} تومان</span>
          </div>
        ))}
      </div>
    </div>
  );
}
