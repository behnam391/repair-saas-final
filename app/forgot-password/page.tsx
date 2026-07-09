"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message || "کد ارسال شد");
    setStep(2);
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.message || "کد نامعتبر است"); return; }
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={step === 1 ? requestCode : submitReset} className="w-full max-w-sm bg-surface border border-surface2 rounded-2xl p-6">
        <h1 className="text-lg font-extrabold mb-1">بازیابی رمز عبور</h1>
        <p className="text-xs text-muted mb-6">
          {step === 1 ? "شماره موبایل ثبت‌شده خود را وارد کنید" : "کد پیامک‌شده و رمز جدید را وارد کنید"}
        </p>

        {step === 1 ? (
          <>
            <label className="block text-xs text-muted mb-1">شماره موبایل</label>
            <input
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxxx"
            />
          </>
        ) : (
          <>
            {message && <p className="text-teal text-xs mb-3">{message}</p>}
            <label className="block text-xs text-muted mb-1">کد ۵ رقمی</label>
            <input
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={5}
            />
            <label className="block text-xs text-muted mb-1">رمز عبور جدید</label>
            <input
              type="password"
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </>
        )}

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button disabled={loading} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {loading ? "..." : step === 1 ? "ارسال کد" : "تغییر رمز عبور"}
        </button>

        <p className="text-[11px] text-muted text-center mt-4">
          <Link href="/login" className="text-copper">بازگشت به صفحه ورود</Link>
        </p>
      </form>
    </div>
  );
}
