"use client";
import SendInvoiceButton from "@/components/SendInvoiceButton";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";
import { FileText, Plus, Printer, Share2, CreditCard, Pencil, Trash2, Search, X, Save } from "lucide-react";
import "./invoices.css";

const PUBLIC_APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://peyvo.ir").replace(/\/+$/, "");

type Ticket = {
  id: string; no: number; deviceModel: string; lane: string; invoice: any;
  customer: { name: string };
};
type InvItem = { id: string; name: string; quantity: number; sellPrice: number };
type Invoice = {
  id: string; type: string; laborCost: number; partsCost: number; taxPercent: number; taxAmount: number; total: number; paid: boolean; paidAmount: number; createdAt: string;
  customerName: string | null;
  ticket: { no: number; deviceModel: string; customer: { name: string } } | null;
  items: { quantity: number; item: { name: string } }[];
};

export default function InvoicesPage() {
  const [readyTickets, setReadyTickets] = useState<Ticket[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [laborCost, setLaborCost] = useState(0);
  const [parts, setParts] = useState<{ itemId: string; quantity: number }[]>([]);
  const [applyTax, setApplyTax] = useState(true);
  const [settlementMode, setSettlementMode] = useState<"CREDIT" | "PARTIAL" | "PAID">("CREDIT");
  const [initialPaidAmount, setInitialPaidAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(10);
  const [error, setError] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({ laborCost: 0, applyTax: true, paidAmount: 0 });
  const [shareMsg, setShareMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const visibleInvoices = invoices.filter(inv => {
    const text = `${inv.ticket?.deviceModel ?? ""} ${inv.ticket?.no ?? ""} ${inv.ticket?.customer.name ?? inv.customerName ?? ""}`;
    return text.toLowerCase().includes(query.toLowerCase()) && (statusFilter === "all" || (statusFilter === "paid" ? inv.paid : !inv.paid));
  });

  async function load() {
    setLoading(true);
    const [tRes, iRes, invRes, shopRes] = await Promise.all([
      fetch("/api/tickets?lane=READY"),
      fetch("/api/inventory"),
      fetch("/api/invoices"),
      fetch("/api/shop"),
    ]);
    const tData = await tRes.json();
    const iData = await iRes.json();
    const invData = await invRes.json();
    setReadyTickets((tData.tickets ?? []).filter((t: Ticket) => !t.invoice));
    setItems(iData.items ?? []);
    setInvoices(invData.invoices ?? []);
    if (shopRes.ok) {
      const shopData = await shopRes.json();
      setTaxPercent(shopData.shop.taxPercent ?? 10);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function addPartLine() {
    if (items.length === 0) return;
    setParts([...parts, { itemId: items[0].id, quantity: 1 }]);
  }
  function updatePart(idx: number, field: "itemId" | "quantity", value: string | number) {
    const next = [...parts];
    (next[idx] as any)[field] = value;
    setParts(next);
  }
  function removePart(idx: number) {
    setParts(parts.filter((_, i) => i !== idx));
  }

  const partsCostPreview = parts.reduce((sum, p) => {
    const item = items.find((i) => i.id === p.itemId);
    return sum + (item ? item.sellPrice * p.quantity : 0);
  }, 0);
  const invoiceTotalPreview = partsCostPreview + laborCost + (applyTax ? Math.round(((partsCostPreview + laborCost) * taxPercent) / 100) : 0);
  const outstandingInvoices = invoices.filter((invoice) => !invoice.paid);
  const totalReceivable = outstandingInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.total - (invoice.paidAmount || 0)), 0);
  const partialCount = outstandingInvoices.filter((invoice) => invoice.paidAmount > 0).length;

  async function submit() {
    setError("");
    if (!selectedTicket) { setError("یک دستگاه آماده‌تحویل را انتخاب کنید"); return; }
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: selectedTicket,
        laborCost,
        parts,
        applyTax,
        paidAmount: settlementMode === "PAID" ? invoiceTotalPreview : settlementMode === "PARTIAL" ? Math.min(initialPaidAmount, invoiceTotalPreview) : 0,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "صدور فاکتور ناموفق بود");
      return;
    }
    setSelectedTicket(""); setLaborCost(0); setParts([]); setSettlementMode("CREDIT"); setInitialPaidAmount(0);
    load();
  }

  function startInvoiceEdit(inv: Invoice) {
    setEditingInvoiceId(inv.id);
    setEditInvoiceForm({ laborCost: inv.laborCost, applyTax: inv.taxAmount > 0, paidAmount: inv.paidAmount ?? (inv.paid ? inv.total : 0) });
  }

  async function saveInvoiceEdit(id: string) {
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editInvoiceForm),
    });
    setEditingInvoiceId(null);
    load();
  }

  async function deleteInvoice(id: string) {
    if (!confirm("این فاکتور حذف شود؟ قطعات مصرفی به انبار برمی‌گردند.")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  }

  async function shareInvoice(inv: Invoice) {
    const url = `${PUBLIC_APP_ORIGIN}/pay/${inv.id}`;
    const customer = inv.ticket?.customer.name ?? inv.customerName ?? "مشتری";
    const remaining = Math.max(0, inv.total - (inv.paidAmount || 0));
    const text = `${customer} عزیز، فاکتور شما به مبلغ ${inv.total.toLocaleString("fa-IR")} تومان آماده است.${remaining > 0 ? ` مانده قابل پرداخت: ${remaining.toLocaleString("fa-IR")} تومان.` : " فاکتور تسویه شده است."} مشاهده فاکتور: ${url}`;
    try {
      const usedShare = typeof navigator.share === "function";
      if (usedShare) await navigator.share({ title: "فاکتور پیوو", text, url });
      else await navigator.clipboard.writeText(text);
      setShareMsg(usedShare ? "فاکتور برای ارسال آماده شد" : "متن و لینک فاکتور کپی شد");
      window.setTimeout(() => setShareMsg(""), 2500);
    } catch {}
  }

  return (
    <div className="invoice-workspace p-4 mx-auto" dir="rtl">
      <header className="invoice-page-head"><div><span className="invoice-eyebrow">امور مالی / فاکتورها</span><h1><FileText size={24}/>مدیریت فاکتورها</h1><p>صدور، پیگیری پرداخت و ارسال فاکتور به مشتری</p></div><button className="invoice-button invoice-primary" aria-expanded={showCreate} onClick={() => setShowCreate(!showCreate)}>{showCreate ? <X size={18}/> : <Plus size={18}/>} {showCreate ? "بستن فرم" : "فاکتور جدید"}</button></header>
      {shareMsg && <div className="mb-3 rounded-lg bg-teal/15 p-2.5 text-center text-xs font-bold text-teal">{shareMsg}</div>}

      {loading ? (
        <p className="text-muted text-sm">در حال بارگذاری...</p>
      ) : (
        <>
          <section className="invoice-summary mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-danger/20 bg-danger/10 p-3"><small className="text-[10px] text-muted">کل مطالبات باقی‌مانده</small><b className="mt-1 block text-base text-danger">{totalReceivable.toLocaleString("fa-IR")} تومان</b></div>
            <div className="rounded-xl border border-amber/20 bg-amber/10 p-3"><small className="text-[10px] text-muted">پرداخت ناقص</small><b className="mt-1 block text-base text-amber">{partialCount.toLocaleString("fa-IR")} فاکتور</b></div>
            <div className="rounded-xl border border-surface2 bg-surface p-3"><small className="text-[10px] text-muted">نسیه و تسویه‌نشده</small><b className="mt-1 block text-base">{outstandingInvoices.length.toLocaleString("fa-IR")} فاکتور</b></div>
          </section>
          {showCreate && <div className="invoice-create bg-surface border border-surface2 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-bold mb-3">صدور فاکتور جدید</h2>

            <label className="block text-xs text-muted mb-1">دستگاه آماده تحویل بدون فاکتور</label>
            <select
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
              value={selectedTicket}
              onChange={(e) => setSelectedTicket(e.target.value)}
            >
              <option value="">انتخاب کنید...</option>
              {readyTickets.map((t) => (
                <option key={t.id} value={t.id}>#{t.no} · {t.deviceModel} · {t.customer.name}</option>
              ))}
            </select>
            {readyTickets.length === 0 && (
              <p className="text-[11px] text-muted mb-3">هیچ دستگاه «آماده تحویل» بدون فاکتور وجود ندارد.</p>
            )}

            <label className="block text-xs text-muted mb-1">هزینه دستمزد (تومان)</label>
            <input
              type="text" inputMode="numeric" dir="ltr"
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
              value={laborCost}
              onChange={(e) => setLaborCost(num(e.target.value))}
            />

            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-muted">قطعات مصرفی</label>
              <button onClick={addPartLine} disabled={!items.length} className="invoice-button"><Plus size={16}/>افزودن قطعه</button>
            </div>
            {parts.map((p, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  className="flex-1 bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={p.itemId}
                  onChange={(e) => updatePart(idx, "itemId", e.target.value)}
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} (موجودی: {i.quantity})</option>
                  ))}
                </select>
                <input
                  type="text" inputMode="numeric" dir="ltr"
                  className="w-16 bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={p.quantity}
                  onChange={(e) => updatePart(idx, "quantity", num(e.target.value))}
                />
                <button aria-label="حذف قطعه" onClick={() => removePart(idx)} className="invoice-button invoice-danger"><Trash2 size={16}/></button>
              </div>
            ))}

            <label className="flex items-center gap-2 text-xs text-muted mb-2">
              <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} />
              اعمال مالیات {taxPercent}٪ (قابل تغییر در پنل مدیریت)
            </label>

            <div className="text-xs text-muted mt-2 mb-1">
              جمع قطعات: <span className="mono">{partsCostPreview.toLocaleString("fa-IR")}</span> تومان ·
              {" "}جمع فرعی: <span className="mono">{(partsCostPreview + laborCost).toLocaleString("fa-IR")}</span> تومان
              {applyTax && <> · مالیات: <span className="mono">{Math.round(((partsCostPreview + laborCost) * taxPercent) / 100).toLocaleString("fa-IR")}</span> تومان</>}
              <br />
              <span className="font-bold text-ink">جمع کل: {invoiceTotalPreview.toLocaleString("fa-IR")} تومان</span>
            </div>

            <div className="mt-4 rounded-xl border border-surface2 bg-surface2/60 p-3">
              <label className="mb-2 block text-xs font-bold">وضعیت تسویه هنگام تحویل</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["CREDIT", "نسیه"],
                  ["PARTIAL", "پرداخت بخشی"],
                  ["PAID", "تسویه کامل"],
                ] as const).map(([value, label]) => <button type="button" key={value} onClick={() => { setSettlementMode(value); if (value !== "PARTIAL") setInitialPaidAmount(0); }} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${settlementMode === value ? value === "PAID" ? "border-teal bg-teal/15 text-teal" : value === "PARTIAL" ? "border-amber bg-amber/15 text-amber" : "border-danger bg-danger/10 text-danger" : "border-border bg-surface text-muted"}`}>{label}</button>)}
              </div>
              {settlementMode === "PARTIAL" && <div className="mt-3"><label className="mb-1 block text-[10px] text-muted">مبلغی که الآن دریافت شد (تومان)</label><input type="text" inputMode="numeric" dir="ltr" className="w-full rounded-lg bg-surface px-3 py-2 text-sm" value={initialPaidAmount || ""} onChange={(event) => setInitialPaidAmount(Math.min(invoiceTotalPreview, num(event.target.value)))} /><p className="mt-1 text-[10px] text-amber">مانده نسیه: {Math.max(0, invoiceTotalPreview - initialPaidAmount).toLocaleString("fa-IR")} تومان</p></div>}
            </div>

            {error && <p className="text-danger text-xs mt-2">{error}</p>}

            <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm mt-3">
              صدور فاکتور
            </button>
          </div>}

          <section className="invoice-history"><div className="invoice-history-head"><h2>فاکتورهای صادرشده <span>{visibleInvoices.length.toLocaleString("fa-IR")}</span></h2><div className="invoice-filters"><label className="invoice-search"><Search size={18}/><input aria-label="جست‌وجوی فاکتور" placeholder="نام مشتری، دستگاه یا کد پیگیری…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="فیلتر وضعیت پرداخت" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">همه وضعیت‌ها</option><option value="paid">تسویه‌شده</option><option value="unpaid">دارای مانده</option></select></div></div>
          <div className="invoice-list">
            {invoices.length === 0 && <p className="text-xs text-muted">هنوز فاکتوری صادر نشده.</p>}
            {invoices.length > 0 && !visibleInvoices.length && <p className="invoice-empty">فاکتوری با این مشخصات پیدا نشد.</p>}
            {visibleInvoices.map((inv) => (
              editingInvoiceId === inv.id ? (
                <div key={inv.id} className="bg-surface2 border border-copper rounded-lg p-3 text-xs space-y-2">
                  <label className="block text-[11px] text-muted">اجرت تعمیر (تومان)</label>
                  <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface rounded-lg px-2 py-1.5"
                    value={editInvoiceForm.laborCost} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, laborCost: num(e.target.value) })} />
                  <label className="flex items-center gap-2 text-[11px] text-muted">
                    <input type="checkbox" checked={editInvoiceForm.applyTax} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, applyTax: e.target.checked })} />
                    اعمال مالیات
                  </label>
                  <label className="block text-[11px] text-muted">مبلغ پرداخت‌شده تا این لحظه (تومان)</label>
                  <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface rounded-lg px-2 py-1.5"
                    value={editInvoiceForm.paidAmount || ""} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, paidAmount: Math.min(inv.total, num(e.target.value)) })} />
                  <div className="text-[10px] text-amber">مانده: {Math.max(0, inv.total - editInvoiceForm.paidAmount).toLocaleString("fa-IR")} تومان</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEditInvoiceForm({ ...editInvoiceForm, paidAmount: 0 })} className="rounded-lg border border-danger/25 bg-danger/10 py-2 text-[10px] font-bold text-danger">ثبت به‌عنوان نسیه</button>
                    <button type="button" onClick={() => setEditInvoiceForm({ ...editInvoiceForm, paidAmount: inv.total })} className="rounded-lg border border-teal/25 bg-teal/10 py-2 text-[10px] font-bold text-teal">تسویه کامل</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveInvoiceEdit(inv.id)} className="invoice-button invoice-primary"><Save size={16}/>ذخیره تغییرات</button>
                    <button onClick={() => setEditingInvoiceId(null)} className="invoice-button"><X size={16}/>انصراف</button>
                  </div>
                </div>
              ) : (
                <article key={inv.id} className="invoice-record">
                  <div className="invoice-record-head">
                    <span className="font-bold">
                      {inv.ticket
                        ? `${inv.ticket.deviceModel} #${inv.ticket.no}`
                        : `🛒 فروش مستقیم${inv.items.length ? ` (${inv.items.map((it) => it.item.name).slice(0, 2).join("، ")}${inv.items.length > 2 ? "…" : ""})` : ""}`}
                    </span>
                    <span className="invoice-amount">{inv.total.toLocaleString("fa-IR")} <small>تومان</small></span>
                  </div>
                  <div className="text-muted mt-1">
                    {inv.ticket?.customer.name ?? inv.customerName ?? "مشتری متفرقه"} · {formatJalaliDate(inv.createdAt)}
                    {" "}· <span className={inv.paid ? "text-teal" : inv.paidAmount > 0 ? "text-amber" : "text-danger"}>{inv.paid ? "تسویه کامل" : inv.paidAmount > 0 ? "پرداخت بخشی" : "نسیه"}</span>
                  </div>
                  {!inv.paid && <div className="mt-1 text-[10px] text-muted">پرداخت‌شده: {(inv.paidAmount || 0).toLocaleString("fa-IR")} · مانده: {Math.max(0, inv.total - (inv.paidAmount || 0)).toLocaleString("fa-IR")} تومان</div>}
                  {inv.taxAmount > 0 && <div className="text-muted mt-0.5">شامل {inv.taxPercent}٪ مالیات ({inv.taxAmount.toLocaleString("fa-IR")} تومان)</div>}
                  <div className="invoice-actions" aria-label="عملیات فاکتور">
                    <a href={`/invoices/${inv.id}/print`} target="_blank" rel="noopener noreferrer" className="invoice-button"><Printer size={17}/>چاپ و مشاهده</a>
                    {inv.ticket && <SendInvoiceButton id={inv.id} />}
                    <a href={`/invoices/${inv.id}/print`} className="invoice-button invoice-bale"><img src="/images/trust/bale.webp" width={20} height={20} alt=""/>تصویر در بله</a>
                    <button onClick={() => shareInvoice(inv)} className="invoice-button"><Share2 size={17}/>اشتراک لینک</button>
                    {!inv.paid && (
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`${PUBLIC_APP_ORIGIN}/pay/${inv.id}`).then(() => setShareMsg("لینک پرداخت کپی شد"), () => setShareMsg("کپی لینک ممکن نشد؛ از اشتراک لینک استفاده کنید"));
                        }}
                        className="invoice-button" title="لینک صفحه پرداخت آنلاین این فاکتور کپی می‌شود">
                        <CreditCard size={17}/>لینک پرداخت
                      </button>
                    )}
                    <button onClick={() => startInvoiceEdit(inv)} className="invoice-button"><Pencil size={17}/>ویرایش و تسویه</button>
                    <button onClick={() => deleteInvoice(inv.id)} className="invoice-button invoice-danger"><Trash2 size={17}/>حذف</button>
                  </div>
                </article>
              )
            ))}
          </div></section>
        </>
      )}
    </div>
  );
}
