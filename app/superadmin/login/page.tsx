"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthSubmit, PasswordField, PhoneField } from "@/components/AuthShell";
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
    <AuthShell accent="violet" eyebrow="مرکز فرماندهی" title="مدیریت پلتفرم" description="دسترسی امن ویژه‌ی مدیر سرویس Peyvo."
      asideTitle="نبض کل پلتفرم در یک نگاه" asideText="عملکرد کسب‌وکارها، درآمد و سلامت سرویس را از یک مرکز کنترل کنید."
      asideItems={["نمای جامع تمام فروشگاه‌ها", "کنترل اشتراک و احراز هویت", "گزارش‌ها و تنظیمات مرکزی"]}>
      <form onSubmit={submit} className="auth-form">
        <PhoneField value={phone} onChange={(v) => setPhone(toLatinDigits(v))} />
        <PasswordField value={password} onChange={setPassword} />
        {error && <div className="auth-error">{error}</div>}
        <AuthSubmit loading={loading}>ورود امن</AuthSubmit>
        <div className="auth-alt">این بخش فقط برای مدیر اصلی پلتفرم در دسترس است.</div>
      </form>
    </AuthShell>
  );
}
