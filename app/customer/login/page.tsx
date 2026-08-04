"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await fetch("/api/customer/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    setStep(2);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("customer-credentials", { phone, code, name, redirect: false });
    setLoading(false);
    if (res?.error) { setError("کد نامعتبر یا منقضی شده است."); return; }
    router.push("/customer/shops");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={step === 1 ? requestCode : verify} className="w-full max-w-sm bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-xl mb-1">پنل مشتریان</h1>
        <p className="text-xs text-muted mb-6">
          {step === 1 ? "با شماره موبایل خود وارد شوید یا ثبت‌نام کنید" : "کد پیامک‌شده را وارد کنید"}
        </p>

        {step === 1 ? (
          <>
            <label className="block text-xs text-muted mb-1">شماره موبایل</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
              value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" />
          </>
        ) : (
          <>
            <label className="block text-xs text-muted mb-1">کد ۵ رقمی</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm mono"
              value={code} onChange={(e) => setCode(e.target.value)} maxLength={5} />
            <label className="block text-xs text-muted mb-1">نام شما (فقط بار اول)</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
              value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" />
          </>
        )}

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button disabled={loading} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {loading ? "..." : step === 1 ? "ارسال کد" : "ورود"}
        </button>
      </form>
    </div>
  );
}
