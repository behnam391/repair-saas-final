"use client";
import { useEffect, useState } from "react";
export default function BaleCampaignManager() {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function load() { const r = await fetch("/api/superadmin/bale-campaigns"); if (r.ok) setRows((await r.json()).campaigns); }
  useEffect(() => { load().catch(() => setResult("دریافت گزارش ممکن نشد")); }, []);
  async function action(action: string, id?: string) {
    setBusy(true); setResult("");
    try {
      const r = await fetch("/api/superadmin/bale-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id, audience, message, phone }) });
      const d = await r.json();
      if (!r.ok || d.ok === false) throw Error(d.error || "ارسال انجام نشد");
      setResult(action === "create" ? `پیش‌نویس برای ${d.total} مخاطب دارای رضایت ساخته شد. برای شروع، ارسال را بزنید.` : action === "test" ? "درخواست آزمایشی پذیرفته شد؛ دریافت را روی بله بررسی کنید." : "بسته ارسال پردازش شد؛ گزارش زیر را بررسی کنید.");
      await load();
    } catch (e) { setResult(e instanceof Error ? e.message : "خطا؛ گزارش را بررسی کنید"); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 p-4 border border-border rounded-xl space-y-3"><h2 className="font-bold">پیشنهادها و تبلیغات در بله</h2><p className="text-sm text-muted">فقط برای اعضای فعال با رضایت دریافت پیشنهادها؛ بدون پیامک پشتیبان. شماره‌های تکراری یک‌بار ارسال می‌شوند.</p><select className="w-full bg-surface2 p-3 rounded" value={audience} onChange={e => setAudience(e.target.value)}><option value="all">همه اعضا</option><option value="shops">مدیران و کارکنان تعمیرگاه‌ها</option><option value="customers">مشتریان پیوو</option></select><textarea maxLength={1500} className="w-full bg-surface2 p-3 rounded" placeholder="متن پیشنهاد و لینک دلخواه" value={message} onChange={e => setMessage(e.target.value)} /><p className="text-sm whitespace-pre-wrap border border-border rounded p-3">پیش‌نمایش: {message || "متن را وارد کنید"}<br />لینک لغو دریافت به انتهای پیام اضافه می‌شود.</p><input className="w-full bg-surface2 p-3 rounded" placeholder="شماره آزمایش" value={phone} onChange={e => setPhone(e.target.value)} /><button disabled={busy || !message || !phone} onClick={() => action("test")} className="p-3 border rounded">ارسال آزمایشی</button><button disabled={busy || !message} onClick={() => action("create")} className="p-3 border rounded">ساخت پیش‌نویس و شمارش مخاطبان</button><p role="status">{result}</p>{rows.map(row => <article key={row.id} className="border border-border rounded p-3 space-y-2"><p className="whitespace-pre-wrap">{row.message}</p><p>کل: {row.total} · پذیرفته‌شده: {row.accepted} · باقی‌مانده: {row.pending} · نامشخص: {row.uncertain}</p><button disabled={busy || !row.pending} onClick={() => action("send", row.id)} className="bg-copper p-2 rounded">ارسال بسته بعدی (حداکثر ۵ نفر)</button></article>)}<p className="text-xs text-muted">پذیرفته‌شده به معنی تحویل قطعی نیست. موارد نامشخص برای جلوگیری از پیام تکراری دوباره ارسال نمی‌شوند.</p></section>;
}
