"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatJalaliDate } from "@/lib/jalali";
import { ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react";

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
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session, router]);

  async function load(q = search, requestedPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(requestedPage), pageSize: String(pageSize) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/superadmin/customers?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }
  useEffect(() => { load(search, page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/superadmin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function deleteCustomer(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/superadmin/customers/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDelete(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.message || "حذف ناموفق بود"); return; }
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <div className="flex items-center gap-3 mt-2"><span className="w-11 h-11 rounded-2xl bg-copper/10 text-copper grid place-items-center"><UsersRound size={21} /></span><h1 className="font-extrabold text-lg">مشتریان پلتفرم</h1></div>
      <p className="text-xs text-muted mb-4">
        حساب‌های سراسری مشتریان (پنل `/customer`) — مجموع {total.toLocaleString("fa-IR")} حساب. تعلیق یک حساب، ورود و امتیازدهی جدید را مسدود می‌کند.
      </p>

      <div className="flex gap-2 mb-4 bg-surface border border-border rounded-2xl p-2">
        <Search size={18} className="self-center text-muted mr-1" />
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجو با نام، شماره یا ایمیل..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(search, 1))} />
        <button onClick={() => { setPage(1); load(search, 1); }} className="bg-copper text-white rounded-lg px-4 text-sm">جستجو</button>
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
                  {" "}· عضویت {formatJalaliDate(c.createdAt)}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => toggleActive(c.id, c.active)}
                  className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition ${c.active ? "bg-danger/20 text-danger hover:bg-danger/30" : "bg-teal/20 text-teal hover:bg-teal/30"}`}>
                  {c.active ? "تعلیق" : "فعال‌سازی"}
                </button>
                {confirmDelete === c.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => deleteCustomer(c.id)} disabled={deletingId === c.id}
                      className="text-[10px] font-bold rounded-lg px-2 py-1 bg-danger text-white disabled:opacity-50">
                      {deletingId === c.id ? "..." : "حذف قطعی"}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] rounded-lg px-2 py-1 bg-surface text-muted">لغو</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(c.id)}
                    className="text-[10px] font-semibold rounded-lg px-2.5 py-1 bg-danger/10 text-danger hover:bg-danger/20 transition">
                    🗑 حذف از دیتابیس
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="super-pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={15} /> قبلی</button><span>صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(total / pageSize)).toLocaleString("fa-IR")}</span><button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>بعدی <ChevronLeft size={15} /></button></div>
        </div>
      )}
    </div>
  );
}
