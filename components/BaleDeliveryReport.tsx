"use client";
import { useState } from "react";
const labels: Record<string, string> = { pending: "در انتظار ارسال", sending: "در حال پردازش؛ تحویل نامشخص", accepted: "پذیرفته‌شده توسط سرویس؛ تحویل تأیید نشده", failed: "ارسال انجام نشد", uncertain: "نتیجه نامشخص؛ تکرار نکنید", skipped: "ارسال نشد؛ فاقد شرایط یا رضایت" };
export default function BaleDeliveryReport({ id }: { id: string }) {
  const [rows, setRows] = useState<{phone:string;status:string;updatedAt:string;providerMessageId:string|null;providerStatus:number|null;providerStatusText:string|null;checkedAt:string|null}[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load(next = page, refresh = false) {
    setBusy(true); setError("");
    try { if (refresh) { const report = await fetch("/api/superadmin/bale-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh", id, page: next }), signal: AbortSignal.timeout(20000) }); if (!report.ok) throw Error(); } const r = await fetch(`/api/superadmin/bale-campaigns?id=${encodeURIComponent(id)}&page=${next}`); if (!r.ok) throw Error(); const d = await r.json();setRows(d.deliveries);setTotal(d.total);setPage(next); }
    catch { setError("گزارش دریافت نشد؛ دوباره تلاش کنید"); } finally { setBusy(false); }
  }
  return <div><button disabled={busy} className="border rounded p-2" onClick={() => load()}>{busy ? "دریافت گزارش…" : "گزارش نفر‌به‌نفر / تازه‌سازی"}</button>{rows && <button disabled={busy} className="border rounded p-2" onClick={() => load(page, true)}>استعلام وضعیت این صفحه از سرویس</button>}<p className="text-sm text-muted my-2">گزارش سرویس به معنی خوانده‌شدن پیام یا تأیید عضویت در بله نیست. پیام‌های قدیمی بدون شناسه سرویس قابل استعلام نیستند.</p>{error && <p role="alert">{error}</p>}{rows && <><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>شماره</th><th>وضعیت درخواست</th><th>گزارش سرویس</th><th>آخرین استعلام</th></tr></thead><tbody>{rows.map(r => <tr key={r.phone}><td dir="ltr">{r.phone}</td><td>{labels[r.status] ?? "نامشخص"}</td><td>{r.providerStatusText || (r.providerMessageId ? "هنوز گزارشی دریافت نشده" : "فاقد شناسه قابل استعلام")}{r.providerStatus !== null && <small className="block">کد سرویس: {r.providerStatus}</small>}</td><td>{r.checkedAt ? new Date(r.checkedAt).toLocaleString("fa-IR") : "—"}</td></tr>)}</tbody></table></div><div className="flex gap-3"><button disabled={busy || page <= 1} onClick={() => load(page - 1)}>قبلی</button><span>صفحه {page.toLocaleString("fa-IR")}</span><button disabled={busy || page * 50 >= total} onClick={() => load(page + 1)}>بعدی</button></div></>}</div>;
}
