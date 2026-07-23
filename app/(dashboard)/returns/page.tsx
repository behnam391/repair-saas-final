"use client";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";

type Ret = {
  id: string; deviceModel: string; customerName: string; reason: string; refundAmount: number | null;
  resolved: boolean; resolutionNote: string | null; createdAt: string;
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Ret[]>([]);
  const [form, setForm] = useState({ deviceModel: "", customerName: "", customerPhone: "", reason: "", refundAmount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  async function load() {
    const res = await fetch("/api/returns");
    if (res.ok) setReturns((await res.json()).returns ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.deviceModel || !form.customerName || !form.reason) return;
    await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, refundAmount: form.refundAmount || undefined }),
    });
    setForm({ deviceModel: "", customerName: "", customerPhone: "", reason: "", refundAmount: 0 });
    load();
  }

  function startEdit(r: Ret) {
    setEditingId(r.id);
    setEditForm({ deviceModel: r.deviceModel, customerName: r.customerName, reason: r.reason, refundAmount: r.refundAmount ?? 0, resolutionNote: r.resolutionNote ?? "" });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    load();
  }

  async function toggleResolved(r: Ret) {
    await fetch(`/api/returns/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !r.resolved }),
    });
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">مرجوعی‌ها</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6 space-y-2">
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="مدل دستگاه"
          value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} />
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="نام مشتری"
          value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="شماره تماس (اختیاری)"
          value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        <textarea className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="دلیل مرجوعی"
          value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="مبلغ بازگشتی (تومان، اختیاری)"
          value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: num(e.target.value) })} />
        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">ثبت مرجوعی</button>
      </div>

      <div className="space-y-2">
        {returns.map((r) => (
          editingId === r.id ? (
            <div key={r.id} className="bg-surface2 border border-copper rounded-lg p-3 text-xs space-y-2">
              <input className="w-full bg-surface rounded-lg px-2 py-1.5" value={editForm.deviceModel} onChange={(e) => setEditForm({ ...editForm, deviceModel: e.target.value })} />
              <input className="w-full bg-surface rounded-lg px-2 py-1.5" value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} />
              <textarea className="w-full bg-surface rounded-lg px-2 py-1.5" value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} />
              <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface rounded-lg px-2 py-1.5" value={editForm.refundAmount} onChange={(e) => setEditForm({ ...editForm, refundAmount: num(e.target.value) })} />
              <input className="w-full bg-surface rounded-lg px-2 py-1.5" placeholder="یادداشت حل مشکل" value={editForm.resolutionNote} onChange={(e) => setEditForm({ ...editForm, resolutionNote: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(r.id)} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-1.5">ذخیره</button>
                <button onClick={() => setEditingId(null)} className="flex-1 bg-surface rounded-lg py-1.5">انصراف</button>
              </div>
            </div>
          ) : (
            <div key={r.id} className={`bg-surface2 border rounded-lg p-3 text-xs ${r.resolved ? "border-teal/40" : "border-surface2"}`}>
              <div className="flex justify-between">
                <span className="font-bold">{r.deviceModel} — {r.customerName}</span>
                {r.refundAmount && <span className="mono">{r.refundAmount.toLocaleString("fa-IR")} تومان</span>}
              </div>
              <div className="text-muted mt-1">{r.reason}</div>
              {r.resolutionNote && <div className="text-teal mt-1">✔ {r.resolutionNote}</div>}
              <div className="flex justify-between items-center mt-2">
                <div className="text-[10px] text-muted">{formatJalaliDate(r.createdAt)}</div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(r)} className="text-copper text-[10px] font-semibold">ویرایش</button>
                  <button onClick={() => toggleResolved(r)} className={`text-[10px] font-semibold ${r.resolved ? "text-muted" : "text-teal"}`}>
                    {r.resolved ? "بازگشایی" : "علامت‌گذاری حل‌شده"}
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
