"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
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
      body: JSON.stringify({ phone, channel }),
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
      <form onSubmit={step === 1 ? requestCode : submitReset} className="w-full max-w-sm bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">بازیابی رمز عبور</h1>
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
            <label className="block text-xs text-muted mb-2">کد بازیابی از طریق:</label>
            <div className="flex bg-surface2 rounded-lg p-1 mb-4">
              <button type="button" onClick={() => setChannel("sms")}
                className={`flex-1 text-xs font-bold rounded-md py-2 transition ${channel === "sms" ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
                پیامک
              </button>
              <button type="button" onClick={() => setChannel("email")}
                className={`flex-1 text-xs font-bold rounded-md py-2 transition ${channel === "email" ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
                ایمیل
              </button>
            </div>
            {channel === "email" && (
              <p className="text-[10px] text-muted mb-4">کد به ایمیلی که هنگام ثبت‌نام یا در پروفایل ثبت کرده‌اید ارسال می‌شود.</p>
            )}
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
