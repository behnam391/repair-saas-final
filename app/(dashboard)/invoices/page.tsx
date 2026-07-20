"use client";
import { useEffect, useState } from "react";

type Ticket = {
  id: string; no: number; deviceModel: string; lane: string; invoice: any;
  customer: { name: string };
};
type InvItem = { id: string; name: string; quantity: number; sellPrice: number };
type Invoice = {
  id: string; type: string; laborCost: number; partsCost: number; taxPercent: number; taxAmount: number; total: number; paid: boolean; createdAt: string;
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
  const [taxPercent, setTaxPercent] = useState(10);
  const [error, setError] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({ laborCost: 0, applyTax: true, paid: false });
  const [loading, setLoading] = useState(true);

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

  async function submit() {
    setError("");
    if (!selectedTicket) { setError("یک دستگاه آماده‌تحویل را انتخاب کنید"); return; }
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selectedTicket, laborCost, parts, applyTax }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "صدور فاکتور ناموفق بود");
      return;
    }
    setSelectedTicket(""); setLaborCost(0); setParts([]);
    load();
  }

  function startInvoiceEdit(inv: Invoice) {
    setEditingInvoiceId(inv.id);
    setEditInvoiceForm({ laborCost: inv.laborCost, applyTax: inv.taxAmount > 0, paid: inv.paid });
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

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">صدور و تاریخچه فاکتور</h1>

      {loading ? (
        <p className="text-muted text-sm">در حال بارگذاری...</p>
      ) : (
        <>
          <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
            <div className="text-sm font-bold mb-3">صدور فاکتور جدید</div>

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
              type="number"
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
              value={laborCost}
              onChange={(e) => setLaborCost(+e.target.value)}
            />

            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-muted">قطعات مصرفی</label>
              <button onClick={addPartLine} className="text-xs text-copper font-semibold">+ افزودن قطعه</button>
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
                  type="number" min={1}
                  className="w-16 bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={p.quantity}
                  onChange={(e) => updatePart(idx, "quantity", +e.target.value)}
                />
                <button onClick={() => removePart(idx)} className="text-danger text-xs px-2">✕</button>
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
              <span className="font-bold text-ink">جمع کل: {(partsCostPreview + laborCost + (applyTax ? Math.round(((partsCostPreview + laborCost) * taxPercent) / 100) : 0)).toLocaleString("fa-IR")} تومان</span>
            </div>

            {error && <p className="text-danger text-xs mt-2">{error}</p>}

            <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm mt-3">
              صدور فاکتور
            </button>
          </div>

          <div className="text-sm font-bold mb-2">فاکتورهای صادرشده</div>
          <div className="space-y-2">
            {invoices.length === 0 && <p className="text-xs text-muted">هنوز فاکتوری صادر نشده.</p>}
            {invoices.map((inv) => (
              editingInvoiceId === inv.id ? (
                <div key={inv.id} className="bg-surface2 border border-copper rounded-lg p-3 text-xs space-y-2">
                  <label className="block text-[11px] text-muted">اجرت تعمیر (تومان)</label>
                  <input type="number" className="w-full bg-surface rounded-lg px-2 py-1.5"
                    value={editInvoiceForm.laborCost} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, laborCost: +e.target.value })} />
                  <label className="flex items-center gap-2 text-[11px] text-muted">
                    <input type="checkbox" checked={editInvoiceForm.applyTax} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, applyTax: e.target.checked })} />
                    اعمال مالیات
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-muted">
                    <input type="checkbox" checked={editInvoiceForm.paid} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, paid: e.target.checked })} />
                    پرداخت‌شده است
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => saveInvoiceEdit(inv.id)} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-1.5">ذخیره</button>
                    <button onClick={() => setEditingInvoiceId(null)} className="flex-1 bg-surface rounded-lg py-1.5">انصراف</button>
                  </div>
                </div>
              ) : (
                <div key={inv.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold">
                      {inv.ticket
                        ? `${inv.ticket.deviceModel} #${inv.ticket.no}`
                        : `🛒 فروش مستقیم${inv.items.length ? ` (${inv.items.map((it) => it.item.name).slice(0, 2).join("، ")}${inv.items.length > 2 ? "…" : ""})` : ""}`}
                    </span>
                    <span className="mono">{inv.total.toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div className="text-muted mt-1">
                    {inv.ticket?.customer.name ?? inv.customerName ?? "مشتری متفرقه"} · {new Date(inv.createdAt).toLocaleDateString("fa-IR")}
                    {" "}· <span className={inv.paid ? "text-teal" : "text-amber"}>{inv.paid ? "پرداخت‌شده" : "پرداخت‌نشده"}</span>
                  </div>
                  {inv.taxAmount > 0 && <div className="text-muted mt-0.5">شامل {inv.taxPercent}٪ مالیات ({inv.taxAmount.toLocaleString("fa-IR")} تومان)</div>}
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <a href={`/invoices/${inv.id}/print`} target="_blank" className="text-copper text-[10px] font-semibold">🖨 چاپ</a>
                    {!inv.paid && (
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/pay/${inv.id}`);
                        }}
                        className="text-teal text-[10px] font-semibold" title="لینک صفحه پرداخت آنلاین این فاکتور کپی می‌شود">
                        💳 کپی لینک پرداخت
                      </button>
                    )}
                    <button onClick={() => startInvoiceEdit(inv)} className="text-copper text-[10px] font-semibold">ویرایش</button>
                    <button onClick={() => deleteInvoice(inv.id)} className="text-danger text-[10px] font-semibold">حذف</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
}
