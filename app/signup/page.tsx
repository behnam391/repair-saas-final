"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ shopName: "", address: "", ownerName: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-surface border border-surface2 rounded-2xl p-6">
        <h1 className="text-lg font-extrabold mb-1">ثبت‌نام مغازه جدید</h1>
        <p className="text-xs text-muted mb-6">با پلن رایگان شروع کنید، هر زمان می‌توانید ارتقا دهید</p>

        {[
          ["نام مغازه/تعمیرگاه", "shopName"],
          ["آدرس مغازه (اختیاری)", "address"],
          ["نام شما (مدیر)", "ownerName"],
          ["شماره موبایل", "phone"],
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
        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">رمز عبور</label>
          <input
            type="password"
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
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
