"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, MapPin, NotebookTabs, Pencil, Phone, Plus, Search, Store, Trash2, X } from "lucide-react";
import { toLatinDigits } from "@/lib/phone";

type Partner = { id: string; name: string; phone: string; address: string; note: string; source: "LINKED" | "MANUAL" | "HISTORY"; linkedShopId?: string };
const EMPTY = { name: "", phone: "", address: "", note: "" };

export default function PartnersPage() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/partners?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (response.ok) setRows((await response.json()).partners ?? []);
    setLoading(false);
  }, [query]);
  useEffect(() => { const timer = setTimeout(load, 220); return () => clearTimeout(timer); }, [load]);

  function add() { setEditing(null); setForm(EMPTY); setError(""); setOpen(true); }
  function edit(row: Partner) { setEditing(row); setForm({ name: row.name, phone: row.phone, address: row.address, note: row.note }); setError(""); setOpen(true); }
  async function save() {
    setError("");
    const response = await fetch(editing ? `/api/partners/${editing.id}` : "/api/partners", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!response.ok) { setError((await response.json().catch(() => ({}))).message || "ذخیره انجام نشد"); return; }
    setOpen(false); load();
  }
  async function remove(row: Partner) {
    if (!confirm(`«${row.name}» از دفترچه حذف شود؟`)) return;
    const response = await fetch(`/api/partners/${row.id}`, { method: "DELETE" });
    if (response.ok) load();
  }

  return <div className="workspace-page partner-workspace mx-auto max-w-5xl p-4">
    <div className="workspace-page-head">
      <div><span>شبکه همکاران</span><h1 className="display-heading">دفترچه همکاران</h1><p>همکارهای لینک‌شده، مخاطبان دستی و پذیرش‌های قبلی را سریع پیدا کنید.</p></div>
      <div className="workspace-head-actions"><span className="workspace-head-stat"><b>{rows.length.toLocaleString("fa-IR")}</b><small>همکار در فهرست</small></span><button onClick={add} className="workspace-primary-button"><Plus size={17} /> افزودن همکار</button></div>
    </div>
    <label className="workspace-search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو با نام، شماره یا آدرس..." /></label>
    {loading ? <p className="py-12 text-center text-xs text-muted">در حال دریافت دفترچه...</p> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-surface2 p-10 text-center"><Store className="mx-auto mb-2 text-muted" /><b className="text-sm">هنوز همکاری ثبت نشده است</b><p className="mt-1 text-xs text-muted">همکار را دستی اضافه کنید یا از بخش همکاری مغازه‌ها لینک شوید.</p></div> : <div className="partner-workspace-grid grid gap-3 sm:grid-cols-2">
      {rows.map((row) => <article key={row.id} className={`rounded-2xl border p-4 ${row.source === "LINKED" ? "border-teal/45 bg-teal/5" : "border-surface2 bg-surface"}`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><b className="truncate text-sm">{row.name}</b>{row.source === "LINKED" && <span className="flex items-center gap-1 rounded-lg bg-teal/15 px-2 py-1 text-[10px] font-bold text-teal"><BadgeCheck size={12} /> لینک‌شده</span>}{row.source === "HISTORY" && <span className="rounded-lg bg-copper/10 px-2 py-1 text-[10px] text-copper">پذیرش قبلی</span>}</div>{row.phone && <p dir="ltr" className="mt-2 flex items-center gap-1 text-right text-xs text-muted"><Phone size={13} /> {row.phone}</p>}{row.address && <p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin size={13} /> {row.address}</p>}{row.note && <p className="mt-2 text-[11px] text-muted">{row.note}</p>}</div>
          {row.source === "MANUAL" && <div className="flex gap-1"><button onClick={() => edit(row)} className="rounded-lg bg-surface2 p-2 text-copper"><Pencil size={14} /></button><button onClick={() => remove(row)} className="rounded-lg bg-danger/10 p-2 text-danger"><Trash2 size={14} /></button></div>}
        </div>
      </article>)}
    </div>}
    {open && <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/65 p-4 sm:items-center" onClick={() => setOpen(false)}><div className="workspace-modal-panel w-full max-w-md rounded-2xl border border-surface2 bg-surface p-5" onClick={(e) => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><b>{editing ? "ویرایش همکار" : "افزودن همکار"}</b><button onClick={() => setOpen(false)}><X size={18} /></button></div>
      <label className="mb-1 block text-[11px] text-muted">نام همکار یا مغازه *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mb-3 w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm" />
      <label className="mb-1 block text-[11px] text-muted">شماره تماس</label><input dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: toLatinDigits(e.target.value) })} className="mb-3 w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm" />
      <label className="mb-1 block text-[11px] text-muted">آدرس</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mb-3 w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm" />
      <label className="mb-1 block text-[11px] text-muted">یادداشت</label><textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mb-3 w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm" />
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}<button onClick={save} className="w-full rounded-xl bg-copper py-2.5 text-sm font-bold text-[#1A1410]">ذخیره در دفترچه</button>
    </div></div>}
  </div>;
}
