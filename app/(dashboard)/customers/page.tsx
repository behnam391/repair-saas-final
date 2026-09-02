"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { formatJalaliDate } from "@/lib/jalali";
import { toLatinDigits } from "@/lib/phone";
import { BookUser, Mail, Pencil, Phone, Plus, Search, Trash2, Wrench } from "lucide-react";

type Cust = {
  id: string; name: string; phone: string;
  email: string | null; address: string | null; note: string | null;
  createdAt: string; _count: { tickets: number };
};

const PAGE_SIZE = 10;
const EMPTY = { name: "", phone: "", email: "", address: "", note: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Cust | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?page=${page}&pageSize=${PAGE_SIZE}&q=${encodeURIComponent(search)}`, { cache: "no-store" });
      if (res.ok && currentRequest === requestId.current) {
        const d = await res.json();
        setCustomers(d.customers ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page, search]);

  // Debounced fetch on search/page change.
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  // A new search always starts from page 1.
  useEffect(() => { setPage(1); }, [search]);

  function openAdd() { setEditingId(null); setForm(EMPTY); setFormError(""); setShowForm(true); }
  function openEdit(c: Cust) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "", address: c.address ?? "", note: c.note ?? "" });
    setFormError(""); setShowForm(true);
  }

  async function saveForm() {
    setFormError("");
    if (!form.name.trim() || !form.phone.trim()) { setFormError("نام و شماره تماس لازم است."); return; }
    setSaving(true);
    const res = await fetch(editingId ? `/api/customers/${editingId}` : "/api/customers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); setFormError(e.message || "ذخیره ناموفق بود"); return; }
    setShowForm(false);
    load();
  }

  async function doDelete() {
    if (!toDelete) return;
    setDeleting(true); setMsg("");
    const force = toDelete._count.tickets > 0;
    const res = await fetch(`/api/customers/${toDelete.id}${force ? "?force=true" : ""}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); setMsg(e.message || "حذف ناموفق بود"); setToDelete(null); return; }
    setToDelete(null);
    // If we removed the last row of a non-first page, step back.
    if (customers.length === 1 && page > 1) setPage(page - 1); else load();
  }

  const th = "px-3 py-2 text-right font-bold border border-surface2/60 whitespace-nowrap";
  const td = "px-3 py-2 border border-surface2/60 align-middle";

  return (
    <div className="workspace-page customers-workspace p-4 max-w-5xl mx-auto">
      <div className="workspace-page-head">
        <div>
          <span>ارتباط با مشتری</span>
          <h1 className="display-heading">دفترچه مشتریان</h1>
          <p>اطلاعات تماس و سابقه تعمیر هر مشتری را یک‌جا و منظم نگه دارید.</p>
        </div>
        <div className="workspace-head-actions">
          <span className="workspace-head-stat"><b>{total.toLocaleString("fa-IR")}</b><small>مشتری ثبت‌شده</small></span>
          <button onClick={openAdd} className="workspace-primary-button"><Plus size={17} /> افزودن مشتری</button>
        </div>
      </div>

      <label className="workspace-search">
        <Search size={18} />
        <input placeholder="جستجو با نام یا شماره تماس..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {msg && <p className="text-danger text-xs mb-3">{msg}</p>}

      {/* Excel-style table (scrolls sideways on small screens) */}
      <div className="customer-table-shell overflow-x-auto rounded-xl border border-surface2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-surface2 text-muted">
              <th className={th}>#</th>
              <th className={th}>نام</th>
              <th className={th}>تلفن</th>
              <th className={th}>ایمیل</th>
              <th className={`${th} text-center`}>تعمیر</th>
              <th className={th}>تاریخ ثبت</th>
              <th className={`${th} text-center`}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className={`${td} text-center text-muted`} colSpan={7}>در حال بارگذاری...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td className={`${td} text-center text-muted py-6`} colSpan={7}>مشتری‌ای پیدا نشد.</td></tr>
            ) : (
              customers.map((c, i) => (
                <tr key={c.id} className={`${i % 2 ? "bg-surface2/20" : ""} hover:bg-surface2/40`}>
                  <td className={`${td} text-muted mono`}>{((page - 1) * PAGE_SIZE + i + 1).toLocaleString("fa-IR")}</td>
                  <td className={`${td} font-semibold`}>
                    {c.name}
                    {c.note && <span title={c.note} className="ms-1 text-amber">🗒</span>}
                  </td>
                  <td className={`${td} mono`} dir="ltr">{c.phone}</td>
                  <td className={`${td} text-muted`} dir="ltr">{c.email || "—"}</td>
                  <td className={`${td} text-center mono`}>{c._count.tickets.toLocaleString("fa-IR")}</td>
                  <td className={`${td} text-muted whitespace-nowrap`}>{formatJalaliDate(c.createdAt)}</td>
                  <td className={td}>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(c)} title="ویرایش" aria-label={`ویرایش ${c.name}`} className="grid h-9 w-9 place-items-center rounded-lg bg-copper/10 text-copper"><Pencil size={15} /></button>
                      <button onClick={() => setToDelete(c)} title="حذف" aria-label={`حذف ${c.name}`} className="grid h-9 w-9 place-items-center rounded-lg bg-danger/10 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="customer-mobile-list">
        {loading ? <div className="customer-mobile-card text-center text-muted">در حال بارگذاری...</div> : customers.length === 0 ? (
          <div className="customer-mobile-card py-8 text-center"><BookUser className="mx-auto mb-2 text-muted" /><b>مشتری‌ای پیدا نشد</b><p className="mt-1 text-xs text-muted">نام یا شماره دیگری را جستجو کنید.</p></div>
        ) : customers.map((c) => (
          <article key={c.id} className="customer-mobile-card">
            <header><h2>{c.name}</h2><span>{c._count.tickets.toLocaleString("fa-IR")} تعمیر</span></header>
            <div>
              <span><Phone size={14} /> {c.phone}</span>
              {c.email && <span><Mail size={14} /> {c.email}</span>}
              <span><Wrench size={14} /> عضویت از {formatJalaliDate(c.createdAt)}</span>
            </div>
            <footer>
              <button onClick={() => openEdit(c)}><Pencil size={14} /> ویرایش</button>
              <button onClick={() => setToDelete(c)}><Trash2 size={14} /> حذف</button>
            </footer>
          </article>
        ))}
      </div>

      {/* Pagination */}
      <div className="workspace-pagination text-xs">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}
          className="rounded-lg px-3 py-1.5 bg-surface2 border border-surface2 disabled:opacity-40">→ قبلی</button>
        <span className="text-muted">
          مجموع {total.toLocaleString("fa-IR")} مشتری — صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
          className="rounded-lg px-3 py-1.5 bg-surface2 border border-surface2 disabled:opacity-40">بعدی ←</button>
      </div>

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4" onClick={() => setShowForm(false)}>
          <div className="workspace-modal-panel bg-surface border border-surface2 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-sm mb-3">{editingId ? "ویرایش مشتری" : "افزودن مشتری"}</div>
            <label className="block text-[11px] text-muted mb-1">نام *</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="block text-[11px] text-muted mb-1">شماره تماس *</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2 mono" dir="ltr"
              inputMode="tel" placeholder="09xxxxxxxxx"
              /* This is what SMS is sent to, and what links the customer to
                 their own account. Latin digits only. See lib/phone.ts. */
              value={form.phone} onChange={(e) => setForm({ ...form, phone: toLatinDigits(e.target.value) })} />
            <label className="block text-[11px] text-muted mb-1">ایمیل (اختیاری)</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2" dir="ltr"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="block text-[11px] text-muted mb-1">آدرس (اختیاری)</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2"
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <label className="block text-[11px] text-muted mb-1">یادداشت / اطلاعات اضافی (اختیاری)</label>
            <textarea rows={3} className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {formError && <p className="text-danger text-xs mb-2">{formError}</p>}
            <div className="flex gap-2">
              <button onClick={saveForm} disabled={saving} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-2 text-sm disabled:opacity-60">
                {saving ? "..." : "ذخیره"}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-surface2 border border-border rounded-lg py-2 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4" onClick={() => setToDelete(null)}>
          <div className="workspace-modal-panel bg-surface border border-danger/40 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-sm mb-1">حذف «{toDelete.name}»؟</div>
            {toDelete._count.tickets > 0 ? (
              <p className="text-[11px] text-danger mb-4">
                این مشتری {toDelete._count.tickets.toLocaleString("fa-IR")} تعمیر ثبت‌شده دارد. با حذف مشتری، آن تعمیرها و فاکتورهایشان هم برای همیشه پاک می‌شوند.
              </p>
            ) : (
              <p className="text-[11px] text-muted mb-4">این مشتری از دفترچه حذف می‌شود.</p>
            )}
            <div className="flex gap-2">
              <button onClick={doDelete} disabled={deleting} className="flex-1 bg-danger text-white font-bold rounded-lg py-2 text-sm disabled:opacity-60">
                {deleting ? "..." : (toDelete._count.tickets > 0 ? "حذف مشتری و تعمیرها" : "حذف")}
              </button>
              <button onClick={() => setToDelete(null)} className="flex-1 bg-surface2 border border-border rounded-lg py-2 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
