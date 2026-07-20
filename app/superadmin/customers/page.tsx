"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type CustomerRow = {
  id: string; name: string; phone: string; email: string | null;
  province: string | null; city: string | null; active: boolean;
  createdAt: string; ratingCount: number;
};

export default function SuperAdminCustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session, router]);

  async function load(q = search) {
    setLoading(true);
    const res = await fetch(`/api/superadmin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/superadmin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">مشتریان پلتفرم</h1>
      <p className="text-xs text-muted mb-4">
        حساب‌های سراسری مشتریان (پنل `/customer`) — مجموع {total.toLocaleString("fa-IR")} حساب. تعلیق یک حساب، ورود و امتیازدهی جدید را مسدود می‌کند.
      </p>

      <div className="flex gap-2 mb-4">
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجو با نام، شماره یا ایمیل..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()} />
        <button onClick={() => load()} className="bg-surface2 rounded-lg px-3 text-sm">جستجو</button>
      </div>

      {loading ? (
        <p className="text-muted text-sm">در حال بارگذاری...</p>
      ) : customers.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">هنوز مشتری‌ای ثبت‌نام نکرده.</p>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <div key={c.id} className={`bg-surface2 border rounded-xl p-3 text-xs flex items-center justify-between gap-3 ${c.active ? "border-surface2" : "border-danger"}`}>
              <div className="min-w-0">
                <div className="font-bold">{c.name} {!c.active && <span className="text-danger font-normal">(معلق)</span>}</div>
                <div className="text-muted mono mt-0.5" dir="ltr">{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                <div className="text-muted mt-0.5">
                  {[c.city, c.province].filter(Boolean).join("، ") || "بدون موقعیت"}
                  {" "}· {c.ratingCount} امتیاز ثبت‌شده
                  {" "}· عضویت {new Date(c.createdAt).toLocaleDateString("fa-IR")}
                </div>
              </div>
              <button
                onClick={() => toggleActive(c.id, c.active)}
                className={`shrink-0 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition ${c.active ? "bg-danger/20 text-danger hover:bg-danger/30" : "bg-teal/20 text-teal hover:bg-teal/30"}`}>
                {c.active ? "تعلیق" : "فعال‌سازی"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
