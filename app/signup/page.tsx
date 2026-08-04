"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import PhoneVerify from "@/components/PhoneVerify";

const BUSINESS_SIZE_OPTIONS = [
  { key: "SOLO", label: "تک‌نفره", desc: "خودم یک‌تنه همه‌کار را انجام می‌دهم" },
  { key: "TEAM", label: "تیمی", desc: "من و چند کارمند، هرکدام روی تخصص خودمان" },
  { key: "ENTERPRISE", label: "مجموعه بزرگ", desc: "کارمندان زیاد، چند شعبه/بخش" },
] as const;

const SPECIALTY_OPTIONS = [
  { key: "HARDWARE", label: "سخت‌افزار" },
  { key: "SOFTWARE", label: "نرم‌افزار" },
  { key: "BOARD", label: "تخصصی (برد/هارد)" },
];

// Step wizard: 1=کسب‌وکار، 2=مغازه، 3=مدیر، 4=موبایل و رمز — same visual
// pattern as the device-intake wizard, so signup doesn't read as one long,
// cluttered form on mobile.
const STEPS = ["کسب‌وکار", "مغازه", "مدیر", "ورود"];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: "", address: "", landlinePhone: "", businessSize: "SOLO" as string, specialties: [] as string[], shopType: "REPAIR" as string,
    ownerName: "", nationalId: "", birthDate: "", phone: "", password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [step, setStep] = useState(1);

  function toggleSpecialty(key: string) {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(key) ? f.specialties.filter((s) => s !== key) : [...f.specialties, key],
    }));
  }

  function nextStep() {
    setError("");
    if (step === 2 && !form.shopName.trim()) {
      setError("نام مغازه را وارد کنید");
      return;
    }
    if (step === 3 && !form.ownerName.trim()) {
      setError("نام مدیر را وارد کنید");
      return;
    }
    setStep(step + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^09\d{9}$/.test(form.phone.trim())) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد");
      return;
    }
    if (!phoneVerified) { setError("ابتدا شماره موبایل را با کد تأیید کنید"); return; }
    setLoading(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "ثبت‌نام ناموفق بود");
      setLoading(false);
      return;
    }
    const signInRes = await signIn("shop-credentials", {
      phone: form.phone, password: form.password, redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) { setError("ثبت‌نام شد ولی ورود خودکار ناموفق بود، لطفاً وارد شوید"); return; }
    router.push("/tickets");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <form onSubmit={step === STEPS.length ? submit : (e) => e.preventDefault()} className="w-full max-w-md bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">ثبت‌نام مغازه جدید</h1>
        <p className="text-xs text-muted mb-5">با پلن رایگان شروع کنید، هر زمان می‌توانید ارتقا دهید</p>

        {/* Step indicator — same visual language as the device-intake wizard */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "active" : "next";
            return (
              <div key={label} className="flex items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  state === "done" ? "bg-teal text-white" : state === "active" ? "bg-copper text-white" : "bg-surface2 text-muted"
                }`}>
                  {state === "done" ? "✓" : n}
                </div>
                <span className={`text-[10px] whitespace-nowrap ${state === "active" ? "font-bold" : "text-muted"}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 ${n < step ? "bg-teal" : "bg-surface2"}`} />}
              </div>
            );
          })}
        </div>

        {step === 1 && (<>
          <label className="block text-xs text-muted mb-2">نوع کسب‌وکار شما</label>
          <div className="flex bg-surface2 rounded-lg p-1 mb-4">
            {BUSINESS_SIZE_OPTIONS.map((o) => (
              <button key={o.key} type="button" onClick={() => setForm({ ...form, businessSize: o.key })}
                className={`flex-1 text-xs font-bold rounded-md py-2 transition ${form.businessSize === o.key ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted mb-5 -mt-2">
            {BUSINESS_SIZE_OPTIONS.find((o) => o.key === form.businessSize)?.desc}
          </p>

          <label className="block text-xs text-muted mb-2">نوع فعالیت</label>
          <div className="flex bg-surface2 rounded-lg p-1 mb-4">
            {[
              ["REPAIR", "تعمیرگاه"],
              ["DEALER", "خرید و فروش"],
              ["BOTH", "هر دو"],
            ].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setForm({ ...form, shopType: val })}
                className={`flex-1 text-xs font-bold rounded-md py-2 transition ${form.shopType === val ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
                {label}
              </button>
            ))}
          </div>

          <label className="block text-xs text-muted mb-2">تخصص‌های مغازه (می‌توانید چند مورد انتخاب کنید)</label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTY_OPTIONS.map((s) => (
              <button key={s.key} type="button" onClick={() => toggleSpecialty(s.key)}
                className={`text-[11px] rounded-full px-3 py-1.5 border transition ${form.specialties.includes(s.key) ? "bg-copper text-[#1A1410] border-copper" : "bg-surface2 border-surface2 text-muted"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </>)}

        {step === 2 && (<>
          {[
            ["نام مغازه/تعمیرگاه", "shopName"],
            ["آدرس مغازه (اختیاری)", "address"],
            ["تلفن ثابت مغازه (اختیاری)", "landlinePhone"],
          ].map(([label, key]) => (
            <div key={key} className="mb-3">
              <label className="block text-xs text-muted mb-1">{label}</label>
              <input
                className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </>)}

        {step === 3 && (<>
          <p className="text-[11px] text-muted mb-3">اطلاعات مدیر (برای احراز هویت و بازیابی حساب)</p>
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">نام شما (مدیر)</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted mb-1">کد ملی</label>
              <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
                value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">تاریخ تولد</label>
              <JalaliDatePicker className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
                value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
            </div>
          </div>
        </>)}

        {step === 4 && (<>
          <div className="mb-2">
            <label className="block text-xs text-muted mb-1">شماره موبایل</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              inputMode="tel" dir="ltr" maxLength={11} placeholder="09xxxxxxxxx"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <PhoneVerify phone={form.phone} email={undefined} onChange={setPhoneVerified} />
          <div className="mb-2">
            <label className="block text-xs text-muted mb-1">رمز عبور</label>
            <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </>)}

        {error && <p className="text-danger text-xs mb-3 mt-3">{error}</p>}

        {/* Wizard navigation */}
        <div className="flex gap-2 mt-5">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setError(""); setStep(step - 1); }}
              className="flex-1 bg-surface2 border border-border font-bold rounded-lg py-2.5 text-sm"
            >
              → قبلی
            </button>
          )}
          {step < STEPS.length ? (
            <button type="button" onClick={nextStep} className="flex-[2] bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
              بعدی ←
            </button>
          ) : (
            <button type="submit" disabled={loading || !phoneVerified} className="flex-[2] bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
              {loading ? "در حال ثبت‌نام..." : !phoneVerified ? "ابتدا شماره را تأیید کنید" : "ثبت‌نام و ورود"}
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted text-center mt-4">
          قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" className="text-copper">ورود</Link>
        </p>
      </form>
    </div>
  );
}
