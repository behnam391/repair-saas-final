"use client";
import { useEffect, useState } from "react";

type Ret = { id: string; deviceModel: string; customerName: string; reason: string; refundAmount: number | null; createdAt: string };

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Ret[]>([]);
  const [form, setForm] = useState({ deviceModel: "", customerName: "", customerPhone: "", reason: "", refundAmount: 0 });

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
        <input type="number" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="مبلغ بازگشتی (تومان، اختیاری)"
          value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: +e.target.value })} />
        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">ثبت مرجوعی</button>
      </div>

      <div className="space-y-2">
        {returns.map((r) => (
          <div key={r.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">{r.deviceModel} — {r.customerName}</span>
              {r.refundAmount && <span className="mono">{r.refundAmount.toLocaleString("fa-IR")} تومان</span>}
            </div>
            <div className="text-muted mt-1">{r.reason}</div>
            <div className="text-[10px] text-muted mt-1">{new Date(r.createdAt).toLocaleDateString("fa-IR")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
