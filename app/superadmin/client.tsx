"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

const PLAN_LABEL: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", business: "تجاری" };

type ShopRow = {
  id: string; name: string; plan: string; active: boolean; planExpiresAt: string | null;
  userCount: number; ticketCount: number; totalPaid: number; createdAt: string;
};

export default function SuperAdminClient() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-extrabold text-lg">پنل مدیریت پلتفرم</h1>
        <button onClick={() => signOut({ callbackUrl: "/superadmin/login" })} className="text-xs text-muted">خروج</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-surface2 rounded-xl p-4">
          <div className="text-xs text-muted mb-1">تعداد مغازه‌ها</div>
          <div className="text-xl font-extrabold mono">{shops.length}</div>
        </div>
        <div className="bg-surface border border-surface2 rounded-xl p-4">
          <div className="text-xs text-muted mb-1">کل درآمد اشتراک</div>
          <div className="text-xl font-extrabold mono">{totalRevenue.toLocaleString("fa-IR")} <span className="text-xs font-normal">تومان</span></div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">در حال بارگذاری...</p>
      ) : (
        <div className="space-y-2">
          {shops.map((s) => (
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
                <button
                  onClick={() => toggleActive(s.id, s.active)}
                  className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 shrink-0 ${s.active ? "bg-danger/20 text-danger" : "bg-teal/20 text-teal"}`}
                >
                  {s.active ? "تعلیق" : "فعال‌سازی"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
