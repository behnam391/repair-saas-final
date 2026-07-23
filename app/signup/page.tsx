"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JalaliDatePicker from "@/components/JalaliDatePicker";

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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: "", address: "", landlinePhone: "", businessSize: "SOLO" as string, specialties: [] as string[], shopType: "REPAIR" as string,
    ownerName: "", nationalId: "", birthDate: "", phone: "", password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleSpecialty(key: string) {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(key) ? f.specialties.filter((s) => s !== key) : [...f.specialties, key],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^09\d{9}$/.test(form.phone.trim())) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد");
      return;
    }
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
      <form onSubmit={submit} className="w-full max-w-md bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">ثبت‌نام مغازه جدید</h1>
        <p className="text-xs text-muted mb-6">با پلن رایگان شروع کنید، هر زمان می‌توانید ارتقا دهید</p>

        <label className="block text-xs text-muted mb-2">نوع کسب‌وکار شما</label>
        <div className="flex bg-surface2 rounded-lg p-1 mb-4">
          {BUSINESS_SIZE_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => setForm({ ...form, businessSize: o.key })}
              className={`flex-1 text-xs font-bold rounded-md py-2 transition ${form.businessSize === o.key ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted mb-4 -mt-2">
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
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SPECIALTY_OPTIONS.map((s) => (
            <button key={s.key} type="button" onClick={() => toggleSpecialty(s.key)}
              className={`text-[11px] rounded-full px-3 py-1.5 border transition ${form.specialties.includes(s.key) ? "bg-copper text-[#1A1410] border-copper" : "bg-surface2 border-surface2 text-muted"}`}>
              {s.label}
            </button>
          ))}
        </div>

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

        <div className="border-t border-surface2 my-4 pt-4">
          <p className="text-[11px] text-muted mb-2">اطلاعات مدیر (برای احراز هویت و بازیابی حساب)</p>
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">نام شما (مدیر)</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
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
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">شماره موبایل</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              inputMode="tel" dir="ltr" maxLength={11} placeholder="09xxxxxxxxx"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-muted mb-1">رمز عبور</label>
            <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button disabled={loading} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {loading ? "در حال ثبت‌نام..." : "ثبت‌نام و ورود"}
        </button>

        <p className="text-[11px] text-muted text-center mt-4">
          قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" className="text-copper">ورود</Link>
        </p>
      </form>
    </div>
  );
}
