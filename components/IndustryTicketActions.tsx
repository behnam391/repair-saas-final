"use client";
import { useState } from "react";
import { toLatinDigits } from "@/lib/phone";
type Ticket = { id: string; status: string; estimatedCost?: number | null; invoice?: { id: string; total: number; paidAmount: number } | null };
export default function IndustryTicketActions({ ticket, demo, onChange }: { ticket: Ticket; demo: boolean; onChange: (message?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState(ticket.invoice);
  const [cost, setCost] = useState(String(ticket.invoice?.total ?? ticket.estimatedCost ?? ""));
  const [paid, setPaid] = useState(String(ticket.invoice?.paidAmount ?? 0));
  if (!["IN_PROGRESS", "READY"].includes(ticket.status)) return null;
  async function request(url: string, method: string, body: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw Error(data.message || "عملیات انجام نشد؛ وضعیت پرونده را بررسی کنید");
    return data;
  }
  return <><button onClick={() => setOpen(v => !v)} aria-expanded={open}>{ticket.status === "READY" ? "تحویل و تسویه" : "اتمام تعمیر"}</button>{open && <form className="industry-action-form" onSubmit={async e => {
    e.preventDefault(); if (busy) return;
    if (demo) { setError("نمونه نمایشی است؛ هیچ تغییری ذخیره نمی‌شود."); return; }
    const total = Number(toLatinDigits(cost)); const amount = Number(toLatinDigits(paid));
    if (!cost.trim() || !Number.isSafeInteger(total) || total < 0 || total > 2000000000 || !Number.isSafeInteger(amount) || amount < 0 || amount > total) { setError("مبلغ‌ها باید معتبر و پرداختی حداکثر برابر هزینه باشد"); return; }
    setBusy(true); setError("");
    try {
      if (ticket.status === "READY") {
        if (invoice) await request(`/api/invoices/${invoice.id}`, "PATCH", { paidAmount: amount });
        else {
          const result = await request("/api/invoices", "POST", { ticketId: ticket.id, laborCost: total, parts: [], applyTax: false, paidAmount: amount });
          setInvoice(result.invoice);
        }
        await request(`/api/tickets/${ticket.id}`, "PATCH", { action: "deliver" });
      } else {
        const result = await request(`/api/tickets/${ticket.id}`, "PATCH", { action: "ready", estimatedCost: total });
        if (result.sms?.sent === false) { onChange(result.sms.message || "وضعیت ثبت شد، اما پیامک ارسال نشد."); return; }
      }
      setOpen(false); onChange();
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ارتباط؛ قبل از تکرار، فاکتورها را بررسی کنید"); }
    finally { setBusy(false); }
  }}>
    <label>هزینه کل (تومان)<input value={cost} disabled={!!invoice} required inputMode="numeric" onChange={e => setCost(toLatinDigits(e.target.value))}/></label>
    {ticket.status === "READY" && <><label>مبلغ پرداخت‌شده (تومان)<input value={paid} required inputMode="numeric" onChange={e => setPaid(toLatinDigits(e.target.value))}/></label><small>مانده به‌عنوان بدهی مشتری در فاکتور ثبت می‌شود. برای افزودن قطعات، ابتدا از بخش فاکتورها فاکتور بسازید.</small></>}
    <p>با تأیید، پیام اطلاع‌رسانی برای مشتری ارسال می‌شود.</p>
    {error && <p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? "در حال ثبت…" : ticket.status === "READY" ? "تأیید تحویل" : "ثبت آماده تحویل"}</button>
  </form>}</>;
}
