"use client";
import { useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";
import { num } from "@/lib/num";
import JalaliDatePicker from "@/components/JalaliDatePicker";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در صف", IN_PROGRESS: "در حال انجام", AWAITING_APPROVAL: "منتظر تأیید",
  READY: "آماده تحویل", DELIVERED: "تحویل‌شده", CANCELLED: "لغوشده",
};

type Result = {
  id: string; no: number; deviceModel: string; deviceCategory?: string; imei: string | null; issueInitial: string; status: string; createdAt: string;
  customer: { name: string; phone: string }; assignedTo: { name: string } | null;
  invoice: { id: string; total: number; paidAmount: number; paid: boolean } | null;
};

type FinanceEdit = { ticketId: string; invoiceId?: string; total: number; paidAmount: number };

export default function HistoryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [financeEdit, setFinanceEdit] = useState<FinanceEdit | null>(null);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [financeError, setFinanceError] = useState("");

  async function search() {
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/tickets/search?${params.toString()}`);
    if (res.ok) setResults((await res.json()).tickets ?? []);
    setLoading(false);
  }

  function openFinance(result: Result) {
    setFinanceError("");
    setFinanceEdit({
      ticketId: result.id,
      invoiceId: result.invoice?.id,
      total: result.invoice?.total ?? 0,
      paidAmount: result.invoice?.paidAmount ?? 0,
    });
  }

  async function saveFinance() {
    if (!financeEdit) return;
    setFinanceSaving(true);
    setFinanceError("");
    try {
      const paidAmount = Math.min(financeEdit.total, financeEdit.paidAmount);
      const response = financeEdit.invoiceId
        ? await fetch(`/api/invoices/${financeEdit.invoiceId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paidAmount }),
          })
        : await fetch("/api/invoices", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: financeEdit.ticketId, laborCost: financeEdit.total, parts: [], applyTax: false, paidAmount }),
          });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFinanceError(data.message || "ذخیره اطلاعات مالی انجام نشد");
        return;
      }
      setFinanceEdit(null);
      await search();
    } catch {
      setFinanceError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید");
    } finally {
      setFinanceSaving(false);
    }
  }

  return (
    <div className="workspace-page p-4 max-w-5xl mx-auto">
      <h1 className="display-heading text-lg mb-4">سابقه و جستجو</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6 space-y-2">
        <input
          className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجو: نام/شماره مشتری، مدل دستگاه، IMEI یا سریال"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <div className="flex gap-2">
          <select className="flex-1 bg-surface2 rounded-lg px-2 py-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-muted mb-1">از تاریخ</label>
            <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-2 py-2 text-xs" value={from} onChange={setFrom} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-muted mb-1">تا تاریخ</label>
            <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-2 py-2 text-xs" value={to} onChange={setTo} />
          </div>
        </div>
        <button onClick={search} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">جستجو</button>
      </div>

      {searched && (
        loading ? (
          <p className="text-muted text-sm text-center py-8">در حال جستجو...</p>
        ) : results.length === 0 ? (
          <p className="text-xs text-muted text-center py-8">موردی پیدا نشد.</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">{r.deviceCategory === "COMPUTER" ? "💻" : "📱"} {r.deviceModel} #{r.no}</span>
                  <span className="text-muted">{STATUS_LABEL[r.status] ?? r.status}</span>
                </div>
                <div className="text-muted mt-1">{r.customer.name} · {r.customer.phone}</div>
                {r.imei && <div className="mono text-muted mt-0.5">{r.deviceCategory === "COMPUTER" ? "Serial" : "IMEI"}: {r.imei}</div>}
                <div className="text-[#C7CAD1] mt-1">{r.issueInitial}</div>
                <div className="text-[10px] text-muted mt-1">
                  {r.assignedTo?.name && `تعمیرکار: ${r.assignedTo.name} · `}{formatJalaliDate(r.createdAt)}
                </div>
                {r.status === "DELIVERED" && (
                  <div className="mt-3 rounded-xl border border-border bg-surface p-3">
                    {r.invoice ? (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <span><small className="block text-[9px] text-muted">هزینه</small><b>{r.invoice.total.toLocaleString("fa-IR")}</b></span>
                        <span><small className="block text-[9px] text-muted">پرداخت‌شده</small><b className="text-teal">{r.invoice.paidAmount.toLocaleString("fa-IR")}</b></span>
                        <span><small className="block text-[9px] text-muted">مانده</small><b className={r.invoice.paid ? "text-teal" : "text-amber"}>{Math.max(0, r.invoice.total - r.invoice.paidAmount).toLocaleString("fa-IR")}</b></span>
                      </div>
                    ) : <p className="text-[10px] text-amber">اطلاعات مالی این تحویل قبلاً ثبت نشده است.</p>}
                    <button type="button" onClick={() => openFinance(r)} className="mt-2 w-full rounded-lg bg-copper/10 py-2 text-[10px] font-bold text-copper">{r.invoice ? "ویرایش مبلغ پرداخت‌شده و مانده" : "ثبت هزینه و مبلغ پرداخت‌شده"}</button>
                    {financeEdit?.ticketId === r.id && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <label className="block text-[10px] text-muted">هزینه نهایی (تومان)</label>
                        <input type="text" inputMode="numeric" dir="ltr" disabled={!!financeEdit.invoiceId} value={financeEdit.total || ""} onChange={(event) => { const total = num(event.target.value); setFinanceEdit({ ...financeEdit, total, paidAmount: Math.min(financeEdit.paidAmount, total) }); }} className="w-full rounded-lg bg-surface2 px-3 py-2 text-sm disabled:opacity-70" />
                        {financeEdit.invoiceId && <p className="text-[9px] text-muted">برای تغییر جزئیات هزینه، از بخش «فاکتورها» استفاده کنید.</p>}
                        <label className="block text-[10px] text-muted">مبلغ پرداخت‌شده تا این لحظه</label>
                        <input type="text" inputMode="numeric" dir="ltr" value={financeEdit.paidAmount || ""} onChange={(event) => setFinanceEdit({ ...financeEdit, paidAmount: Math.min(financeEdit.total, num(event.target.value)) })} className="w-full rounded-lg bg-surface2 px-3 py-2 text-sm" />
                        <div className="flex justify-between rounded-lg bg-surface2 px-3 py-2 text-[10px]"><span>مانده حساب</span><b className="text-amber">{Math.max(0, financeEdit.total - financeEdit.paidAmount).toLocaleString("fa-IR")} تومان</b></div>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setFinanceEdit({ ...financeEdit, paidAmount: 0 })} className="rounded-lg border border-amber/30 py-2 text-[10px] text-amber">نسیه</button>
                          <button type="button" onClick={() => setFinanceEdit({ ...financeEdit, paidAmount: financeEdit.total })} className="rounded-lg border border-teal/30 py-2 text-[10px] text-teal">تسویه کامل</button>
                        </div>
                        {financeError && <p className="rounded-lg bg-danger/10 p-2 text-[10px] text-danger">{financeError}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={saveFinance} disabled={financeSaving} className="rounded-lg bg-copper py-2 text-[10px] font-bold text-[#1A1410] disabled:opacity-60">{financeSaving ? "در حال ذخیره..." : "ذخیره"}</button>
                          <button type="button" onClick={() => setFinanceEdit(null)} className="rounded-lg bg-surface2 py-2 text-[10px]">انصراف</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
