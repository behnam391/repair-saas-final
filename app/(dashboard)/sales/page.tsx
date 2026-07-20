"use client";
import { useEffect, useMemo, useState } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  PART: "قطعه", ACCESSORY: "لوازم جانبی", PHONE: "گوشی", TOOL: "ابزار", OTHER: "سایر",
};

type InvItem = {
  id: string; name: string; category: string; deviceModel: string | null; imageUrl: string | null;
  quantity: number; sellPrice: number; condition: string;
};
type CartLine = { itemId: string; quantity: number };

export default function SalesPage() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [applyTax, setApplyTax] = useState(true);
  const [taxPercent, setTaxPercent] = useState(10);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);

  async function load() {
    const [iRes, shopRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/shop")]);
    if (iRes.ok) setItems(((await iRes.json()).items ?? []).filter((i: InvItem) => i.quantity > 0 && i.condition === "WORKING"));
    if (shopRes.ok) setTaxPercent((await shopRes.json()).shop?.taxPercent ?? 10);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.deviceModel ?? "").toLowerCase().includes(q));
  }, [items, search]);

  function inCart(id: string) { return cart.find((c) => c.itemId === id); }

  function addToCart(id: string) {
    const existing = inCart(id);
    const stock = items.find((i) => i.id === id)?.quantity ?? 0;
    if (existing) {
      if (existing.quantity >= stock) return;
      setCart(cart.map((c) => (c.itemId === id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { itemId: id, quantity: 1 }]);
    }
  }

  function setQty(id: string, qty: number) {
    const stock = items.find((i) => i.id === id)?.quantity ?? 0;
    if (qty <= 0) { setCart(cart.filter((c) => c.itemId !== id)); return; }
    setCart(cart.map((c) => (c.itemId === id ? { ...c, quantity: Math.min(qty, stock) } : c)));
  }

  const subtotal = cart.reduce((s, c) => {
    const item = items.find((i) => i.id === c.itemId);
    return s + (item ? item.sellPrice * c.quantity : 0);
  }, 0);
  const taxAmount = applyTax ? Math.round((subtotal * taxPercent) / 100) : 0;
  const total = subtotal + taxAmount;

  async function submit() {
    setError("");
    if (cart.length === 0) { setError("حداقل یک کالا به سبد اضافه کنید"); return; }
    setSubmitting(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, customerName: customerName || undefined, customerPhone: customerPhone || undefined, applyTax }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) { setError(data.message || "ثبت فروش ناموفق بود"); return; }
    setLastInvoiceId(data.invoice.id);
    setCart([]); setCustomerName(""); setCustomerPhone("");
    load();
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="display-heading text-lg mb-1">فروش مستقیم</h1>
      <p className="text-[11px] text-muted mb-4">
        فروش لوازم جانبی، قطعه یا هر کالای انبار بدون نیاز به تیکت تعمیر — موجودی خودکار کم می‌شود و فاکتور رسمی صادر می‌شود.
      </p>

      {lastInvoiceId && (
        <div className="bg-teal/10 border border-teal/40 rounded-xl p-3 mb-4 text-xs flex items-center justify-between">
          <span className="text-teal font-bold">✅ فروش ثبت شد و فاکتور صادر شد</span>
          <div className="flex gap-3">
            <a href={`/invoices/${lastInvoiceId}/print`} target="_blank" className="text-copper font-semibold">🖨 چاپ فاکتور</a>
            <button onClick={() => setLastInvoiceId(null)} className="text-muted">✕</button>
          </div>
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="bg-surface border border-copper/40 rounded-xl p-4 mb-4">
          <div className="text-sm font-bold mb-2">🛒 سبد فروش</div>
          <div className="space-y-1.5 mb-3">
            {cart.map((c) => {
              const item = items.find((i) => i.id === c.itemId);
              if (!item) return null;
              return (
                <div key={c.itemId} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="mono text-muted">{item.sellPrice.toLocaleString("fa-IR")}</span>
                  <div className="flex items-center gap-1" dir="ltr">
                    <button onClick={() => setQty(c.itemId, c.quantity - 1)} className="bg-surface2 rounded w-6 h-6">−</button>
                    <span className="mono w-6 text-center">{c.quantity}</span>
                    <button onClick={() => setQty(c.itemId, c.quantity + 1)} className="bg-surface2 rounded w-6 h-6">+</button>
                  </div>
                  <span className="mono font-bold w-20 text-left">{(item.sellPrice * c.quantity).toLocaleString("fa-IR")}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="bg-surface2 rounded-lg px-3 py-2 text-xs" placeholder="نام مشتری (اختیاری)"
              value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <input className="bg-surface2 rounded-lg px-3 py-2 text-xs mono" placeholder="شماره موبایل (برای پیامک فاکتور و لینک پرداخت)"
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted mb-2">
            <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} />
            اعمال مالیات {taxPercent}٪
          </label>
          <div className="text-xs text-muted mb-3">
            جمع: <span className="mono">{subtotal.toLocaleString("fa-IR")}</span>
            {applyTax && <> · مالیات: <span className="mono">{taxAmount.toLocaleString("fa-IR")}</span></>}
            {" "}· <span className="font-bold text-ink">قابل پرداخت: {total.toLocaleString("fa-IR")} تومان</span>
          </div>
          {error && <p className="text-danger text-xs mb-2">{error}</p>}
          <button onClick={submit} disabled={submitting}
            className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
            {submitting ? "در حال ثبت..." : `ثبت فروش و صدور فاکتور (${total.toLocaleString("fa-IR")} تومان)`}
          </button>
        </div>
      )}

      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        placeholder="جستجوی کالا در انبار..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-muted text-center py-8">کالای قابل فروش (موجودی بالای صفر) پیدا نشد — از صفحه انبار کالا اضافه کنید.</p>}
        {filtered.map((i) => {
          const line = inCart(i.id);
          return (
            <div key={i.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2.5 text-xs flex items-center gap-2.5">
              {i.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-surface shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{i.name}</div>
                <div className="text-muted mt-0.5">
                  {CATEGORY_LABEL[i.category] ?? i.category}
                  {i.deviceModel && ` · ${i.deviceModel}`}
                  {" "}· موجودی: {i.quantity}
                </div>
              </div>
              <span className="mono font-bold shrink-0">{i.sellPrice.toLocaleString("fa-IR")}</span>
              <button onClick={() => addToCart(i.id)}
                className={`shrink-0 text-[11px] font-bold rounded-lg px-3 py-1.5 ${line ? "bg-teal/20 text-teal" : "bg-copper text-[#1A1410]"}`}>
                {line ? `در سبد (${line.quantity})` : "+ افزودن"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
