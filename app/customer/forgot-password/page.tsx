"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setLoading(true);
    const res = await fetch("/api/customer/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, channel }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg(data.message || (channel === "email" ? "اگر این شماره ثبت شده باشد، کد ۵ رقمی به ایمیل حساب ارسال شد." : "اگر این شماره ثبت شده باشد، کد ۵ رقمی پیامک شد."));
      setStep(2);
    } else {
      setError(data.message || "خطا در ارسال کد — دوباره تلاش کنید");
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setLoading(true);
    const res = await fetch("/api/customer/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, newPassword }),
    });
    setLoading(false);
    if (res.ok) {
      setMsg("✅ رمز عبور تغییر کرد — در حال انتقال به صفحه ورود...");
      setTimeout(() => router.push("/customer/login"), 1500);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "کد نامعتبر یا منقضی شده است");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={step === 1 ? requestCode : submitReset}
        className="w-full max-w-sm bg-surface border-t-2 border-t-teal border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">بازیابی رمز عبور مشتری</h1>
        <p className="text-xs text-muted mb-6">
          {step === 1 ? "شماره موبایل حساب مشتری خود را وارد کنید تا کد بازیابی پیامک شود." : "کد ۵ رقمی پیامک‌شده و رمز جدید را وارد کنید."}
        </p>

        <label className="block text-xs text-muted mb-1">شماره موبایل</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm mono"
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" disabled={step === 2} />

        {step === 1 && (
          <>
            <label className="block text-xs text-muted mb-2">کد بازیابی از طریق:</label>
            <div className="flex bg-surface2 rounded-lg p-1 mb-4">
              <button type="button" onClick={() => setChannel("sms")}
                className={`flex-1 text-xs font-bold rounded-md py-2 transition ${channel === "sms" ? "bg-teal text-[#0B1512]" : "text-muted"}`}>
                پیامک
              </button>
              <button type="button" onClick={() => setChannel("email")}
                className={`flex-1 text-xs font-bold rounded-md py-2 transition ${channel === "email" ? "bg-teal text-[#0B1512]" : "text-muted"}`}>
                ایمیل
              </button>
            </div>
            {channel === "email" && (
              <p className="text-[10px] text-muted mb-4">کد به ایمیلی که هنگام ثبت‌نام یا در پروفایل حساب مشتری ثبت کرده‌اید ارسال می‌شود.</p>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <label className="block text-xs text-muted mb-1">کد ۵ رقمی</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm mono tracking-widest text-center"
              value={code} onChange={(e) => setCode(e.target.value)} maxLength={5} />
            <label className="block text-xs text-muted mb-1">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
            <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </>
        )}

        {msg && <p className="text-teal text-xs mb-3">{msg}</p>}
        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button disabled={loading}
          className="w-full bg-teal text-[#0B1512] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {loading ? "..." : step === 1 ? "ارسال کد بازیابی" : "تغییر رمز عبور"}
        </button>

        <p className="text-[11px] text-muted text-center mt-4">
          <a href="/customer/login" className="text-teal">بازگشت به ورود</a>
        </p>
      </form>
    </div>
  );
}
