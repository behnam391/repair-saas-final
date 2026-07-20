"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("customer-credentials", { phone, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("شماره موبایل یا رمز عبور اشتباه است");
      return;
    }
    router.push("/customer");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border-t-2 border-t-teal border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">ورود مشتریان</h1>
        <p className="text-xs text-muted mb-6">
          دنبال تعمیرگاه مطمئن می‌گردید؟ وارد شوید تا مغازه‌های اطراف، امتیازها و سابقه تعمیرهای خودتان را ببینید.
        </p>

        <label className="block text-xs text-muted mb-1">شماره موبایل</label>
        <input
          className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09xxxxxxxxx"
        />

        <label className="block text-xs text-muted mb-1">رمز عبور</label>
        <input
          type="password"
          className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-teal text-[#0B1512] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? "در حال ورود..." : "ورود"}
        </button>

        <p className="text-[11px] text-muted text-center mt-4">
          حساب ندارید؟ <a href="/customer/signup" className="text-teal">ثبت‌نام مشتری</a>
        </p>
        <p className="text-[11px] text-muted text-center mt-2">
          <a href="/customer/forgot-password" className="text-teal">رمز عبور را فراموش کرده‌اید؟</a>
        </p>
        <p className="text-[11px] text-muted text-center mt-4 border-t border-surface2 pt-3">
          تعمیرکار هستید؟ <a href="/login" className="text-copper">ورود پنل تعمیرگاه</a>
        </p>
      </form>
    </div>
  );
}
