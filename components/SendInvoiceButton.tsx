"use client";
import { useState } from "react";
export default function SendInvoiceButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <span><button disabled={busy} className="text-copper text-sm" onClick={async () => {
    setBusy(true); setMessage("");
    try { const r = await fetch(`/api/invoices/${id}/send`, { method: "POST" }); const d = await r.json(); setMessage(r.ok ? "درخواست ارسال پذیرفته شد" : d.error || "ارسال انجام نشد"); }
    catch { setMessage("نتیجه نامشخص؛ قبل از تکرار گزارش کاوه‌نگار را بررسی کنید"); }
    finally { setBusy(false); }
  }}>{busy ? "در حال ارسال…" : "ارسال فاکتور در بله / پیامک"}</button><small role="status" className="block">{message}</small></span>;
}
