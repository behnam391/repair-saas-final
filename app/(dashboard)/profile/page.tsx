"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import { toLatinDigits, normalizePhone, isValidMobile } from "@/lib/phone";

const SPECIALTY_LABEL: Record<string, string> = { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی (برد/سی‌پی‌یو)" };

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    avatarUrl: "", phone: "", email: "", gmailId: "", nationalId: "", birthDate: "",
    notifyEmail: false, specialty: "",
  });
  const [name, setName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveErr(data.message || "دریافت اطلاعات پروفایل انجام نشد. دوباره تلاش کنید.");
        return;
      }
      const data = await res.json();
      setName(data.user.name);
      const ROLE_FA: Record<string, string> = { OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" };
      setRoleLabel(ROLE_FA[data.user.role] ?? data.user.role ?? "");
      setForm({
        avatarUrl: data.user.avatarUrl ?? "", phone: data.user.phone ?? "", email: data.user.email ?? "", gmailId: data.user.gmailId ?? "",
        nationalId: data.user.nationalId ?? "",
        birthDate: data.user.birthDate ? data.user.birthDate.slice(0, 10) : "",
        notifyEmail: data.user.notifyEmail,
        specialty: data.user.specialty ?? "",
      });
    } catch { setSaveErr("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید."); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaved(false); setSaveErr("");
    if (name.trim().length < 2) { setSaveErr("نام باید حداقل دو حرف باشد"); return; }
    // Changing this changes how I log in from now on. See lib/phone.ts.
    if (form.phone && !isValidMobile(form.phone)) { setSaveErr("شماره موبایل باید ۱۱ رقمی و با ۰۹ باشد"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: name.trim(), phone: normalizePhone(form.phone), specialty: form.specialty || null }),
      });
      if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2500); }
      else { const d = await res.json().catch(() => ({})); setSaveErr(d.message || d.error || `ذخیره ناموفق بود (کد ${res.status})`); }
    } catch { setSaveErr("ارتباط با سرور برقرار نشد؛ تغییرات ذخیره نشد."); }
    finally { setSaving(false); }
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
    <div className="workspace-page profile-workspace p-4 max-w-4xl mx-auto">
      <div className="workspace-page-head"><div><span>حساب کاربری</span><h1 className="display-heading">پروفایل و تنظیمات من</h1><p>اطلاعات شخصی، تخصص و امنیت حساب خود را مدیریت کنید.</p></div></div>

      <div className="profile-hero">
        <div className="profile-avatar">
          {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" /> : name.slice(0, 2)}
        </div>
        <div><b>{name || "کاربر پیوو"}</b><span>{roleLabel || "عضو تعمیرگاه"}</span></div>
      </div>

      <section className="profile-card">
      <div className="profile-card-title"><b>اطلاعات فردی و کاری</b><span>مشخصاتی که برای حساب شما ثبت می‌شود</span></div>
      <ImageUploader
        label="عکس پروفایل"
        value={form.avatarUrl}
        onChange={(url) => setForm({ ...form, avatarUrl: url })}
      />

      <label className="block text-xs text-muted mb-1">نام و نام خانوادگی</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={name} onChange={(e) => setName(e.target.value)} />

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
        placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: toLatinDigits(e.target.value) })} />

      <label className="block text-xs text-muted mb-1">
        تخصص من {roleLabel && <span className="text-muted">— نقش: {roleLabel}</span>}
      </label>
      <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-1"
        value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
        <option value="">— فقط هماهنگی/پذیرش، کار فنی نمی‌کنم —</option>
        {Object.entries(SPECIALTY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
      <p className="text-[10px] text-muted mb-3">اگر خودتان هم گوشی تعمیر می‌کنید (مثلاً مدیری که نرم‌افزار هم کار می‌کند)، تخصص‌تان را انتخاب کنید.</p>

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
      <button onClick={save} disabled={saving} className="profile-save-button">
        {saving ? "در حال ذخیره..." : saved ? "✓ تغییرات ذخیره شد" : "ذخیره تغییرات پروفایل"}
      </button>
      </section>

      <section className="profile-card">
        <div className="profile-card-title"><b>امنیت حساب</b><span>برای حفظ امنیت، رمز عبور قدرتمند انتخاب کنید</span></div>
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
      </section>
    </div>
  );
}
