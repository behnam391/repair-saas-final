"use client";
/**
 * Signup phone verification widget. Sends a code (SMS or email) to the
 * entered phone, lets the user type it back, and reports verified state to
 * the parent via onChange. The parent blocks its submit button until
 * verified. Re-verification is required if the phone changes.
 */
import { useEffect, useState } from "react";

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

  const valid = /^09\d{9}$/.test(phone.trim());
  const isVerified = !!verifiedPhone && verifiedPhone === phone.trim();

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
      body: JSON.stringify({ phone: phone.trim(), channel, email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setSent(true); setMsg(data.message || "کد ارسال شد."); }
    else setErr(data.message || "ارسال کد ناموفق بود");
  }

  async function verify() {
    setErr(""); setMsg("");
    setBusy(true);
    const res = await fetch("/api/auth/signup/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setVerifiedPhone(phone.trim()); setMsg(""); }
    else setErr(data.message || "کد نادرست است");
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
          <div className="flex gap-2">
            <input
              value={code} onChange={(e) => setCode(e.target.value)}
              inputMode="numeric" dir="ltr" maxLength={5} placeholder="کد ۵ رقمی"
              className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-2 text-sm mono text-center"
            />
            <button type="button" onClick={verify} disabled={busy || code.trim().length < 4}
              className="bg-teal text-white font-bold rounded-lg px-4 text-xs disabled:opacity-50 shrink-0">
              تأیید
            </button>
          </div>
          <button type="button" onClick={sendCode} disabled={busy} className="text-[10px] text-muted">
            ارسال مجدد کد
          </button>
        </>
      )}

      {msg && <p className="text-[11px] text-teal">{msg}</p>}
      {err && <p className="text-[11px] text-danger">{err}</p>}
    </div>
  );
}
