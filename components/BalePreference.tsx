"use client";
import { useEffect, useState } from "react";
export default function BalePreference() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/bale-preference").then(r => { if (!r.ok) throw Error(); return r.json(); }).then(d => { setEnabled(d.enabled); setBusy(false); }).catch(() => setMessage("دریافت تنظیمات بله ممکن نشد؛ صفحه را تازه کنید.")); }, []);
  async function change() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/bale-preference", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
      if (!r.ok) throw Error();
      setEnabled(!enabled); setMessage("تنظیمات ذخیره شد.");
    } catch { setMessage("ذخیره انجام نشد؛ دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  return <section className="p-4 my-4 border border-border rounded-xl bg-surface"><label className="flex gap-3 items-center"><input type="checkbox" checked={enabled} disabled={busy} onChange={change} />دریافت پیشنهادها و تبلیغات پیوو در بله</label><p className="text-sm text-muted mt-2">اختیاری است؛ با خاموش‌کردن این گزینه، دریافت پیشنهادها لغو می‌شود. اعلان فاکتور و تعمیر مستقل است.</p><p role="status">{message}</p></section>;
}
