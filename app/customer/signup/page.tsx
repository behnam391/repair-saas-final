"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IRAN_PROVINCES, PROVINCE_NAMES } from "@/lib/iran-locations";

export default function CustomerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", password: "", email: "", province: "", city: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cities = form.province ? IRAN_PROVINCES[form.province] ?? [] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^09\d{9}$/.test(form.phone)) { setError("شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد"); return; }
    if (form.password.length < 6) { setError("رمز عبور باید حداقل ۶ کاراکتر باشد"); return; }
    setLoading(true);
    const res = await fetch("/api/customer/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "ثبت‌نام ناموفق بود");
      setLoading(false);
      return;
    }
    // sign straight in so the customer lands in their panel with no extra step
    await signIn("customer-credentials", { phone: form.phone, password: form.password, redirect: false });
    router.push("/customer");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border-t-2 border-t-teal border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">ثبت‌نام مشتری</h1>
        <p className="text-xs text-muted mb-6">
          با حساب مشتری می‌توانید تعمیرگاه‌های شهر خود را مقایسه کنید، سابقه تعمیرهای دستگاه‌هایتان را ببینید و به مغازه‌ها امتیاز بدهید.
        </p>

        <label className="block text-xs text-muted mb-1">نام و نام خانوادگی</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-3 text-sm"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label className="block text-xs text-muted mb-1">شماره موبایل</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-3 text-sm mono"
          placeholder="09xxxxxxxxx" inputMode="tel" dir="ltr" maxLength={11}
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <label className="block text-xs text-muted mb-1">رمز عبور (حداقل ۶ کاراکتر)</label>
        <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-3 text-sm"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <label className="block text-xs text-muted mb-1">ایمیل (اختیاری — برای بازیابی رمز عبور)</label>
        <input type="email" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-3 text-sm"
          placeholder="you@example.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="block text-xs text-muted mb-1">استان</label>
            <select className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm"
              value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, city: "" })}>
              <option value="">انتخاب کنید</option>
              {PROVINCE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">شهر</label>
            <select className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm"
              value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!form.province}>
              <option value="">انتخاب کنید</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button disabled={loading}
          className="w-full bg-teal text-[#0B1512] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {loading ? "در حال ثبت‌نام..." : "ثبت‌نام و ورود"}
        </button>

        <p className="text-[11px] text-muted text-center mt-4">
          قبلاً ثبت‌نام کرده‌اید؟ <a href="/customer/login" className="text-teal">ورود</a>
        </p>
      </form>
    </div>
  );
}
