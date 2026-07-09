"use client";
import { useEffect, useState } from "react";

type Ticket = {
  id: string; no: number; deviceModel: string; lane: string; invoice: any;
  customer: { name: string };
};
type InvItem = { id: string; name: string; quantity: number; sellPrice: number };
type Invoice = {
  id: string; laborCost: number; partsCost: number; total: number; createdAt: string;
  ticket: { no: number; deviceModel: string; customer: { name: string } };
};

export default function InvoicesPage() {
  const [readyTickets, setReadyTickets] = useState<Ticket[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [laborCost, setLaborCost] = useState(0);
  const [parts, setParts] = useState<{ itemId: string; quantity: number }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [tRes, iRes, invRes] = await Promise.all([
      fetch("/api/tickets?lane=READY"),
      fetch("/api/inventory"),
      fetch("/api/invoices"),
    ]);
    const tData = await tRes.json();
    const iData = await iRes.json();
    const invData = await invRes.json();
    setReadyTickets((tData.tickets ?? []).filter((t: Ticket) => !t.invoice));
    setItems(iData.items ?? []);
    setInvoices(invData.invoices ?? []);
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
      body: JSON.stringify({ ticketId: selectedTicket, laborCost, parts }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "صدور فاکتور ناموفق بود");
      return;
    }
    setSelectedTicket(""); setLaborCost(0); setParts([]);
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="font-extrabold mb-4">صدور و تاریخچه فاکتور</h1>

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

            <div className="text-xs text-muted mt-2 mb-1">
              جمع قطعات: <span className="mono">{partsCostPreview.toLocaleString("fa-IR")}</span> تومان ·
              {" "}جمع کل: <span className="mono">{(partsCostPreview + laborCost).toLocaleString("fa-IR")}</span> تومان
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
              <div key={inv.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">{inv.ticket.deviceModel} #{inv.ticket.no}</span>
                  <span className="mono">{inv.total.toLocaleString("fa-IR")} تومان</span>
                </div>
                <div className="text-muted mt-1">{inv.ticket.customer.name} · {new Date(inv.createdAt).toLocaleDateString("fa-IR")}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
