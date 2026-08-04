"use client";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

const PLAN_LABEL: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", business: "تجاری" };

type ShopRow = {
  id: string; name: string; plan: string; active: boolean; supportAccessEnabled: boolean; planExpiresAt: string | null;
  userCount: number; ticketCount: number; totalPaid: number; createdAt: string;
};

export default function SuperAdminClient() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");

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
    await fetch(`/api/superadmin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  async function toggleSupportAccess(id: string, current: boolean) {
    await fetch(`/api/superadmin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supportAccessEnabled: !current }),
    });
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

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h1 className="font-extrabold text-lg">پنل مدیریت پلتفرم</h1>
        <button onClick={() => signOut({ callbackUrl: "/superadmin/login" })} className="text-xs text-muted hover:text-danger transition-colors">خروج</button>
      </div>
      <div className="flex gap-3 text-xs mb-5 overflow-x-auto no-scrollbar">
        <a href="/superadmin" className="text-copper font-semibold whitespace-nowrap">مغازه‌ها</a>
        <a href="/superadmin/support" className="text-muted hover:text-ink whitespace-nowrap">پشتیبانی</a>
        <a href="/superadmin/users" className="text-muted hover:text-ink whitespace-nowrap">کاربران</a>
        <a href="/superadmin/conversations" className="text-muted hover:text-ink whitespace-nowrap">نظارت بر چت‌ها</a>
        <a href="/superadmin/notifications" className="text-muted hover:text-ink whitespace-nowrap">اعلان عمومی</a>
        <a href="/superadmin/ads" className="text-muted hover:text-ink whitespace-nowrap">تبلیغات</a>
        <a href="/superadmin/verification" className="text-muted hover:text-ink whitespace-nowrap">احراز هویت</a>
        <a href="/superadmin/external-keys" className="text-muted hover:text-ink whitespace-nowrap">API سازمان‌ها</a>
        <a href="/superadmin/settings" className="text-muted hover:text-ink whitespace-nowrap">تنظیمات API</a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4">
          <div className="text-xs text-muted mb-1">تعداد مغازه‌ها</div>
          <div className="text-xl font-extrabold mono">{shops.length}</div>
        </div>
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4">
          <div className="text-xs text-muted mb-1">مغازه‌های فعال</div>
          <div className="text-xl font-extrabold mono text-teal">{activeCount}</div>
        </div>
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4">
          <div className="text-xs text-muted mb-1">مشترکین پولی</div>
          <div className="text-xl font-extrabold mono text-copper">{paidCount}</div>
        </div>
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4">
          <div className="text-xs text-muted mb-1">کل درآمد اشتراک</div>
          <div className="text-xl font-extrabold mono">{totalRevenue.toLocaleString("fa-IR")}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجوی نام مغازه..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="bg-surface2 border border-surface2 rounded-lg px-2 text-sm" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="">همه پلن‌ها</option>
          <option value="free">رایگان</option>
          <option value="pro">حرفه‌ای</option>
          <option value="business">تجاری</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted text-sm">در حال بارگذاری...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">موردی یافت نشد.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className={`bg-surface2 border rounded-xl p-3.5 ${s.active ? "border-surface2" : "border-danger"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm">{s.name}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    پلن {PLAN_LABEL[s.plan] ?? s.plan} · {s.userCount} کاربر · {s.ticketCount} تیکت
                  </div>
                  {s.planExpiresAt && (
                    <div className="text-[11px] text-muted">انقضا: {new Date(s.planExpiresAt).toLocaleDateString("fa-IR")}</div>
                  )}
                  <div className="text-[11px] text-muted">مجموع پرداختی: {s.totalPaid.toLocaleString("fa-IR")} تومان</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActive(s.id, s.active)}
                    className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition ${s.active ? "bg-danger/20 text-danger hover:bg-danger/30" : "bg-teal/20 text-teal hover:bg-teal/30"}`}
                  >
                    {s.active ? "تعلیق" : "فعال‌سازی"}
                  </button>
                  <button
                    onClick={() => toggleSupportAccess(s.id, s.supportAccessEnabled)}
                    className={`text-[10px] font-semibold rounded-lg px-2.5 py-1 transition ${s.supportAccessEnabled ? "bg-copper/20 text-copper" : "bg-surface text-muted"}`}
                  >
                    {s.supportAccessEnabled ? "دسترسی پشتیبانی: فعال" : "دسترسی پشتیبانی: غیرفعال"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
