"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

type Accent = "blue" | "green" | "violet";

const accents: Record<Accent, { color: string; soft: string; gradient: string }> = {
  blue: { color: "#35a9ff", soft: "rgba(53,169,255,.12)", gradient: "linear-gradient(135deg,#168ff0,#3bb7ff)" },
  green: { color: "#6fd13f", soft: "rgba(111,209,63,.12)", gradient: "linear-gradient(135deg,#46ae25,#7bdc4b)" },
  violet: { color: "#9b87f5", soft: "rgba(155,135,245,.12)", gradient: "linear-gradient(135deg,#7561dd,#a997ff)" },
};

export function AuthShell({
  accent = "blue", eyebrow, title, description, children, asideTitle, asideText, asideItems,
}: {
  accent?: Accent;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  asideTitle: string;
  asideText: string;
  asideItems: string[];
}) {
  const a = accents[accent];
  return (
    <main className="auth-scene min-h-screen" style={{ "--auth-accent": a.color, "--auth-soft": a.soft, "--auth-gradient": a.gradient } as React.CSSProperties}>
      <div className="auth-orb auth-orb-one" aria-hidden />
      <div className="auth-orb auth-orb-two" aria-hidden />
      <Link href="/" className="auth-home-link"><ArrowLeft size={15} /> بازگشت به سایت</Link>

      <div className="auth-shell">
        <section className="auth-form-panel">
          <div className="auth-brand"><Logo size={34} /></div>
          <div className="auth-eyebrow"><span />{eyebrow}</div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-security"><ShieldCheck size={15} /> ارتباط امن و حفاظت‌شده</div>
        </section>

        <aside className="auth-aside">
          <div className="auth-aside-grid" aria-hidden />
          <div className="auth-demo-card auth-demo-card-back">
            <span>رضایت مشتری</span><strong>۹۴٪</strong><i />
          </div>
          <div className="auth-demo-card auth-demo-card-main">
            <div className="auth-mini-top"><span>نمای کلی امروز</span><b>زنده</b></div>
            <div className="auth-mini-value">۱۲ دستگاه</div>
            <div className="auth-mini-chart">{[42,64,48,82,71,95,76].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
          </div>
          <div className="auth-aside-copy">
            <div className="auth-aside-kicker">PEYVO WORKSPACE</div>
            <h2>{asideTitle}</h2>
            <p>{asideText}</p>
            <div className="auth-feature-list">
              {asideItems.map((item) => <div key={item}><span>✓</span>{item}</div>)}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="auth-field">
      <span>شماره موبایل</span>
      <div><Smartphone size={18} /><input value={value} onChange={(e) => onChange(e.target.value)} inputMode="tel" dir="ltr" maxLength={11} placeholder="0912 345 6789" autoComplete="tel" /></div>
    </label>
  );
}

export function PasswordField({ value, onChange, status = "idle" }: { value: string; onChange: (v: string) => void; status?: "idle" | "checking" | "success" | "error" }) {
  const [show, setShow] = useState(false);
  return (
    <label className="auth-field">
      <span>رمز عبور</span>
      <div className={`auth-password-box is-${status}`}>
        <LockKeyhole size={18} />
        <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? "text" : "password"} dir="ltr" placeholder="رمز عبور خود را وارد کنید" autoComplete="current-password" />
        {status === "checking" && <LoaderCircle size={18} className="auth-status-icon is-checking" />}
        {status === "success" && <CheckCircle2 size={19} className="auth-status-icon is-success" />}
        {status === "error" && <XCircle size={19} className="auth-status-icon is-error" />}
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      {status === "success" && <motion.small className="auth-field-result is-success" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>اطلاعات تأیید شد؛ در حال ورود...</motion.small>}
      {status === "error" && <motion.small className="auth-field-result is-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>رمز یا شماره موبایل صحیح نیست</motion.small>}
    </label>
  );
}

export function AuthSubmit({ loading, children }: { loading: boolean; children: ReactNode }) {
  return <button disabled={loading} className="auth-submit">{loading ? <><i /> در حال بررسی...</> : <>{children}<ArrowLeft size={18} /></>}</button>;
}
