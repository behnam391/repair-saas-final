"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { toLatinDigits, normalizePhone } from "@/lib/phone";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("platform-credentials", { phone: normalizePhone(phone), password, redirect: false });
    setLoading(false);
    if (res?.error) { setError("اطلاعات ورود اشتباه است"); return; }
    router.push("/superadmin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-surface border border-surface2 rounded-2xl p-6">
        <div className="flex justify-center mb-4"><Logo size={40} textClassName="text-xl" /></div>
        <h1 className="text-lg font-extrabold mb-1">ورود مدیریت پلتفرم</h1>
        <p className="text-xs text-muted mb-6">این بخش فقط برای صاحب سرویس است</p>

        <label className="block text-xs text-muted mb-1">شماره موبایل</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm mono"
          value={phone} onChange={(e) => setPhone(toLatinDigits(e.target.value))}
          inputMode="tel" dir="ltr" maxLength={11} placeholder="09xxxxxxxxx" />

        <label className="block text-xs text-muted mb-1">رمز عبور</label>
        <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 mb-4 text-sm"
          value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button disabled={loading} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </div>
  );
}
