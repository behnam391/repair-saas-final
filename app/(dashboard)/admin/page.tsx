"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی",
};

type Staff = { id: string; name: string; phone: string; role: string; active: boolean };
type ReportRow = { techId: string; name: string; role: string; closedCount: number; revenue: number };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "HARDWARE" });
  const [error, setError] = useState("");

  const isOwner = (session?.user as any)?.role === "OWNER";

  async function load() {
    const [sRes, rRes] = await Promise.all([fetch("/api/staff"), fetch("/api/reports/staff")]);
    if (sRes.ok) setStaff((await sRes.json()).staff ?? []);
    if (rRes.ok) {
      const data = await rRes.json();
      setReport(data.staff ?? []);
      setMonthRevenue(data.last30DaysRevenue ?? 0);
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

  if (status === "loading") return <p className="p-4 text-sm text-muted">در حال بارگذاری...</p>;
  if (!isOwner) {
    return <p className="p-4 text-sm text-muted">این بخش فقط برای مدیر مغازه قابل دسترسی است.</p>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="font-extrabold mb-4">پنل مدیریت</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-xs text-muted mb-1">درآمد ۳۰ روز اخیر</div>
        <div className="text-xl font-extrabold mono">{monthRevenue.toLocaleString("fa-IR")} <span className="text-xs font-normal">تومان</span></div>
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
        <button onClick={addStaff} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
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
