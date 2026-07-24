"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import JalaliDatePicker from "@/components/JalaliDatePicker";

export default function ProfilePage() {
  const [form, setForm] = useState({
    avatarUrl: "", phone: "", email: "", gmailId: "", nationalId: "", birthDate: "",
    notifyEmail: false,
  });
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  async function load() {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setName(data.user.name);
      setForm({
        avatarUrl: data.user.avatarUrl ?? "", phone: data.user.phone ?? "", email: data.user.email ?? "", gmailId: data.user.gmailId ?? "",
        nationalId: data.user.nationalId ?? "",
        birthDate: data.user.birthDate ? data.user.birthDate.slice(0, 10) : "",
        notifyEmail: data.user.notifyEmail,
      });
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaved(false); setSaveErr("");
    if (form.phone && !/^09\d{9}$/.test(form.phone.trim())) { setSaveErr("شماره موبایل باید ۱۱ رقمی و با ۰۹ باشد"); return; }
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else { const d = await res.json().catch(() => ({})); setSaveErr(d.message || "ذخیره ناموفق بود"); }
  }

  async function changePassword() {
    setPwMsg(""); setPwError("");
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pwForm),
    });
    const data = await res.json();
    if (!res.ok) { setPwError(data.message || "تغییر رمز ناموفق بود"); return; }
    setPwMsg("✅ رمز عبور با موفقیت تغییر کرد");
    setPwForm({ currentPassword: "", newPassword: "" });
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="display-heading text-lg mb-4">پروفایل من</h1>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-16 h-16 rounded-full bg-surface2 border border-surface2 overflow-hidden flex items-center justify-center text-lg font-bold">
          {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" /> : name.slice(0, 2)}
        </div>
        <div className="text-sm font-bold">{name}</div>
      </div>

      <ImageUploader
        label="عکس پروفایل"
        value={form.avatarUrl}
        onChange={(url) => setForm({ ...form, avatarUrl: url })}
      />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-muted mb-1">کد ملی</label>
          <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">تاریخ تولد</label>
          <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
        </div>
      </div>

      <label className="block text-xs text-muted mb-1">شماره موبایل (برای ورود)</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3 mono" dir="ltr" inputMode="tel" maxLength={11}
        placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

      <label className="block text-xs text-muted mb-1">ایمیل</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

      <label className="block text-xs text-muted mb-1">آیدی جیمیل (برای اطلاع‌رسانی)</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
        value={form.gmailId} onChange={(e) => setForm({ ...form, gmailId: e.target.value })} />
      <label className="flex items-center gap-2 text-xs text-muted mb-3">
        <input type="checkbox" checked={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })} />
        اطلاع‌رسانی از طریق ایمیل/جیمیل فعال باشد
      </label>

      {saveErr && <p className="text-danger text-xs mb-2">{saveErr}</p>}
      <button onClick={save} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
        {saved ? "✅ ذخیره شد" : "ذخیره تغییرات"}
      </button>

      <div className="border-t border-surface2 my-6 pt-5">
        <div className="text-sm font-bold mb-3">تغییر رمز عبور</div>
        <label className="block text-xs text-muted mb-1">رمز فعلی</label>
        <input type="password" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
        <label className="block text-xs text-muted mb-1">رمز جدید</label>
        <input type="password" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
        {pwMsg && <p className="text-teal text-xs mb-2">{pwMsg}</p>}
        {pwError && <p className="text-danger text-xs mb-2">{pwError}</p>}
        <button onClick={changePassword} className="w-full bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors font-bold rounded-lg py-2.5 text-sm">
          تغییر رمز عبور
        </button>
        <p className="text-[11px] text-muted text-center mt-3">
          رمز فعلی را به خاطر ندارید؟{" "}
          <a href="/forgot-password" className="text-copper font-semibold">بازیابی با کد پیامکی/ایمیل</a>
          {" "}(اول از سیستم خارج شوید، بعد کد دریافت کنید)
        </p>
      </div>
    </div>
  );
}
