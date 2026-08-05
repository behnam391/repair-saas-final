"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthSubmit, PasswordField, PhoneField } from "@/components/AuthShell";
import { toLatinDigits, normalizePhone } from "@/lib/phone";

export default function CustomerLoginPage() {
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
    const res = await signIn("customer-credentials", { phone: normalizePhone(phone), password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setLoginState("error");
      setError("شماره موبایل یا رمز عبور اشتباه است");
      return;
    }
    setLoginState("success");
    window.setTimeout(() => router.push("/customer"), 700);
  }

  return (
    <AuthShell accent="green" eyebrow="فضای مشتریان" title="تعمیرهایتان همیشه همراه شماست" description="سوابق، پیام‌ها و وضعیت دستگاه‌های خود را یک‌جا ببینید."
      asideTitle="با خیال راحت تعمیر کنید" asideText="تعمیرگاه‌های معتبر را پیدا کنید و لحظه‌به‌لحظه در جریان دستگاه خود باشید."
      asideItems={["مشاهده سوابق تعمیر", "گفت‌وگوی مستقیم با تعمیرگاه", "امتیازها و انتخاب آگاهانه"]}>
      <form onSubmit={handleSubmit} className="auth-form">
        <PhoneField value={phone} onChange={(v) => setPhone(toLatinDigits(v))} />
        <PasswordField value={password} status={loginState} onChange={(v) => { setPassword(v); setLoginState("idle"); }} />
        <div className="auth-form-meta"><span /><a href="/customer/forgot-password">رمز را فراموش کردم</a></div>
        {error && <div className="auth-error">{error}</div>}
        <AuthSubmit loading={loading}>ورود به حساب</AuthSubmit>
        <p className="auth-switch">حساب ندارید؟ <a href="/customer/signup">ثبت‌نام رایگان</a></p>
        <div className="auth-alt">صاحب تعمیرگاه هستید؟ <a href="/login">ورود پنل تعمیرگاه</a></div>
      </form>
    </AuthShell>
  );
}
