"use client";
/**
 * Signup phone verification widget. Sends a code (SMS or email) to the
 * entered phone, lets the user type it back, and reports verified state to
 * the parent via onChange. The parent blocks its submit button until
 * verified. Re-verification is required if the phone changes.
 */
import { useEffect, useState } from "react";
import OtpInput from "@/components/OtpInput";
import { normalizePhone, isValidMobile } from "@/lib/phone";

export default function PhoneVerify({
  phone,
  email,
  onChange,
}: {
  phone: string;
  email?: string;
  onChange: (verified: boolean) => void;
}) {
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  // Bumped on every rejected code so the OTP boxes shake again.
  const [errNonce, setErrNonce] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Compare and send the CANONICAL number, never the raw field. A Persian
  // keyboard types ۰۹…, which fails /^09\d{9}$/ outright — the send button
  // would stay dead forever under "شماره موبایل معتبر وارد کنید", and the
  // code would be stored against a number the user can never match later.
  // See lib/phone.ts.
  const valid = isValidMobile(phone);
  const canonical = normalizePhone(phone);
  const isVerified = !!verifiedPhone && verifiedPhone === canonical;

  // Tell the parent whenever verified state changes; reset if phone changes.
  useEffect(() => { onChange(isVerified); /* eslint-disable-next-line */ }, [isVerified, phone]);

  async function sendCode() {
    setErr(""); setMsg("");
    if (!valid) { setErr("ابتدا شماره موبایل معتبر (۱۱ رقمی) وارد کنید"); return; }
    if (channel === "email" && !email) { setErr("برای ارسال به ایمیل، ابتدا ایمیل را وارد کنید"); return; }
    setBusy(true);
    const res = await fetch("/api/auth/signup/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: canonical, channel, email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setSent(true); setCooldown(60); setMsg(data.message || "کد ارسال شد."); }
    else setErr(data.message || "ارسال کد ناموفق بود");
  }

  async function verify(codeArg?: string) {
    const c = (codeArg ?? code).trim();
    setErr(""); setMsg("");
    setBusy(true);
    const res = await fetch("/api/auth/signup/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: canonical, code: c }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setVerifiedPhone(canonical); setMsg(""); }
    else { setErr(data.message || "کد نادرست است"); setErrNonce((n) => n + 1); }
  }

  if (isVerified) {
    return (
      <div className="bg-teal/15 border border-teal/40 rounded-lg px-3 py-2.5 text-xs text-teal font-bold mb-3">
        ✓ شماره موبایل تأیید شد
      </div>
    );
  }

  return (
    <div className="bg-surface2/60 border border-border rounded-lg p-3 mb-3 space-y-2">
      <div className="text-[11px] font-bold">تأیید شماره موبایل (الزامی)</div>

      {email ? (
        <div className="flex bg-surface2 rounded-lg p-1">
          <button type="button" onClick={() => setChannel("sms")}
            className={`flex-1 text-[11px] rounded-md py-1.5 ${channel === "sms" ? "bg-copper text-white font-bold" : "text-muted"}`}>پیامک</button>
          <button type="button" onClick={() => setChannel("email")}
            className={`flex-1 text-[11px] rounded-md py-1.5 ${channel === "email" ? "bg-copper text-white font-bold" : "text-muted"}`}>ایمیل</button>
        </div>
      ) : null}

      {!sent ? (
        <button type="button" onClick={sendCode} disabled={busy || !valid}
          className="w-full bg-copper text-white font-bold rounded-lg py-2 text-xs disabled:opacity-50">
          {busy ? "..." : "ارسال کد تأیید"}
        </button>
      ) : (
        <>
          <p className="text-[10px] text-muted text-center">کد ۵ رقمی ارسال‌شده را وارد کنید</p>
          <OtpInput
            value={code}
            onChange={(v) => { setCode(v); if (err) setErr(""); }}
            length={5}
            autoFocus
            disabled={busy}
            error={!!err}
            errorNonce={errNonce}
            /* Typing the last digit submits — no extra tap needed. */
            onComplete={(v) => verify(v)}
            className="py-1"
          />
          <button type="button" onClick={() => verify()} disabled={busy || code.length < 5}
            className="w-full bg-teal text-white font-bold rounded-lg py-2 text-xs disabled:opacity-50">
            {busy ? "..." : "تأیید کد"}
          </button>
          <button type="button" onClick={sendCode} disabled={busy || cooldown > 0}
            className="w-full text-[10px] text-muted disabled:opacity-60">
            {cooldown > 0 ? `ارسال مجدد کد تا ${cooldown} ثانیه دیگر` : "ارسال مجدد کد"}
          </button>
        </>
      )}

      {msg && <p className="text-[11px] text-teal">{msg}</p>}
      {err && <p className="text-[11px] text-danger">{err}</p>}
    </div>
  );
}
