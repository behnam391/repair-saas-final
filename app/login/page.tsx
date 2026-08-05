"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import EnamadBadge from "@/components/EnamadBadge";
import { AuthShell, AuthSubmit, PasswordField, PhoneField } from "@/components/AuthShell";
import { toLatinDigits, normalizePhone } from "@/lib/phone";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginState, setLoginState] = useState<"idle" | "checking" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginState("checking");
    setError("");
    // normalizePhone, not the raw field: a Persian-digit or space-padded
    // number matches no row and the user gets told their password is wrong.
    const res = await signIn("shop-credentials", { phone: normalizePhone(phone), password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setLoginState("error");
      setError("شماره موبایل یا رمز عبور اشتباه است");
      return;
    }
    setLoginState("success");
    window.setTimeout(() => router.push("/tickets"), 700);
  }

  return (
    <AuthShell eyebrow="پنل کسب‌وکار" title="خوش آمدید 👋" description="برای مدیریت تعمیرگاه و ادامه‌ی کار وارد حساب خود شوید."
      asideTitle="تعمیرگاهت را هوشمندتر مدیریت کن" asideText="از پذیرش تا تحویل، همه چیز در یک فضای سریع و منظم پیش می‌رود."
      asideItems={["وضعیت لحظه‌ای تعمیرها", "فاکتور، انبار و گزارش مالی", "ارتباط ساده با مشتری"]}>
      <form onSubmit={handleSubmit} className="auth-form">
        <PhoneField value={phone} onChange={(v) => setPhone(toLatinDigits(v))} />
        <PasswordField value={password} status={loginState} onChange={(v) => { setPassword(v); setLoginState("idle"); }} />
        <div className="auth-form-meta"><label><input type="checkbox" /> مرا به خاطر بسپار</label><a href="/forgot-password">رمز را فراموش کردم</a></div>
        {error && <div className="auth-error">{error}</div>}
        <AuthSubmit loading={loading}>ورود به پنل</AuthSubmit>
        <p className="auth-switch">هنوز حساب ندارید؟ <a href="/signup">ساخت رایگان تعمیرگاه</a></p>
        <div className="auth-alt">مشتری هستید؟ <a href="/customer/login">ورود به پنل مشتریان</a></div>
        <EnamadBadge className="mt-4" />
      </form>
    </AuthShell>
  );
}
