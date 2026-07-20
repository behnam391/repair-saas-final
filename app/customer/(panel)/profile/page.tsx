"use client";
import { useEffect, useState } from "react";
import { IRAN_PROVINCES, PROVINCE_NAMES } from "@/lib/iran-locations";

export default function CustomerProfilePage() {
  const [form, setForm] = useState({ name: "", province: "", city: "" });
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  const cities = form.province ? IRAN_PROVINCES[form.province] ?? [] : [];

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/customer/profile");
      if (res.ok) {
        const { customer } = await res.json();
        setPhone(customer.phone);
        setForm({ name: customer.name ?? "", province: customer.province ?? "", city: customer.city ?? "" });
      }
    })();
  }, []);

  async function save() {
    setSaved(false);
    const res = await fetch("/api/customer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function changePassword() {
    setPwMsg(""); setPwError("");
    const res = await fetch("/api/customer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pwForm),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setPwError(data.message || "تغییر رمز ناموفق بود"); return; }
    setPwMsg("✅ رمز عبور با موفقیت تغییر کرد");
    setPwForm({ currentPassword: "", newPassword: "" });
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="display-heading text-lg mb-4">پروفایل من</h1>

      <label className="block text-xs text-muted mb-1">شماره موبایل (قابل تغییر نیست)</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mono mb-3 opacity-70" value={phone} disabled />

      <label className="block text-xs text-muted mb-1">نام و نام خانوادگی</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-xs text-muted mb-1">استان</label>
          <select className="w-full bg-surface2 rounded-lg px-2 py-2 text-sm"
            value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, city: "" })}>
            <option value="">—</option>
            {PROVINCE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">شهر</label>
          <select className="w-full bg-surface2 rounded-lg px-2 py-2 text-sm"
            value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!form.province}>
            <option value="">—</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <p className="text-[10px] text-muted mb-3">استان و شهر شما به‌عنوان فیلتر پیش‌فرض «مغازه‌های اطراف» استفاده می‌شود.</p>

      <button onClick={save} className="w-full bg-teal text-[#0B1512] font-bold rounded-lg py-2.5 text-sm">
        {saved ? "✅ ذخیره شد" : "ذخیره تغییرات"}
      </button>

      <div className="border-t border-surface2 my-6 pt-5">
        <div className="text-sm font-bold mb-3">تغییر رمز عبور</div>
        <label className="block text-xs text-muted mb-1">رمز فعلی</label>
        <input type="password" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
        <label className="block text-xs text-muted mb-1">رمز جدید (حداقل ۶ کاراکتر)</label>
        <input type="password" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
        {pwMsg && <p className="text-teal text-xs mb-2">{pwMsg}</p>}
        {pwError && <p className="text-danger text-xs mb-2">{pwError}</p>}
        <button onClick={changePassword} className="w-full bg-surface2 hover:bg-teal hover:text-[#0B1512] transition-colors font-bold rounded-lg py-2.5 text-sm">
          تغییر رمز عبور
        </button>
      </div>
    </div>
  );
}
