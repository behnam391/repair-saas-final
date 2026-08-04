"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import EnamadBadge from "@/components/EnamadBadge";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("shop-credentials", { phone, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("شماره موبایل یا رمز عبور اشتباه است");
      return;
    }
    router.push("/tickets");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <div className="flex justify-center mb-4"><Logo size={40} textClassName="text-xl" /></div>
        <h1 className="display-heading text-xl mb-1">ورود به پنل تعمیرگاه</h1>
        <p className="text-xs text-muted mb-6">با شماره موبایل و رمز عبور خود وارد شوید</p>

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
          className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? "در حال ورود..." : "ورود"}
        </button>

        <p className="text-[11px] text-muted text-center mt-4">
          مغازه جدید هستید؟ <a href="/signup" className="text-copper">ثبت‌نام کنید</a>
        </p>
        <p className="text-[11px] text-muted text-center mt-2">
          <a href="/forgot-password" className="text-copper">رمز عبور را فراموش کرده‌اید؟</a>
        </p>
        <p className="text-[11px] text-muted text-center mt-4 border-t border-surface2 pt-3">
          مشتری هستید؟ <a href="/customer/login" className="text-teal">ورود مشتریان</a> — مغازه‌های اطرافتان را مقایسه کنید و سابقه تعمیرهایتان را ببینید
        </p>

        <div className="flex justify-center gap-3 flex-wrap mt-4 text-[10px] text-muted">
          <a href="/terms" className="hover:text-copper">قوانین و مقررات</a>
          <a href="/privacy" className="hover:text-copper">حریم خصوصی</a>
          <a href="/refund" className="hover:text-copper">بازگشت وجه</a>
        </div>

        <EnamadBadge className="mt-4" />
      </form>
    </div>
  );
}
