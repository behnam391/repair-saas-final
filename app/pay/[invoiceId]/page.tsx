"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type PayInvoice = {
  id: string; type: string; laborCost: number; partsCost: number; taxPercent: number; taxAmount: number;
  total: number; paid: boolean; paymentRefId: string | null; createdAt: string; customerName: string | null;
  shop: { name: string; phone: string | null; address: string | null };
  ticket: { no: number; deviceModel: string; customer: { name: string } } | null;
  items: { quantity: number; priceCharged: number; item: { name: string } }[];
};

// Public customer-facing payment page — opened from the SMS link, no login.
export default function PayInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.invoiceId as string;
  const result = searchParams.get("result");

  const [invoice, setInvoice] = useState<PayInvoice | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pay/${id}`).then(async (r) => {
      if (!r.ok) { setNotFound(true); return; }
      setInvoice((await r.json()).invoice);
    });
  }, [id, result]);

  async function pay() {
    setError(""); setPaying(true);
    const res = await fetch(`/api/pay/${id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.payUrl) {
      window.location.href = data.payUrl; // off to the Zarinpal gateway
      return;
    }
    setPaying(false);
    setError(data.message || "شروع پرداخت ناموفق بود — دوباره تلاش کنید");
  }

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">فاکتوری با این شناسه پیدا نشد.</div>;
  }
  if (!invoice) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">در حال بارگذاری...</div>;
  }

  const customerLabel = invoice.ticket?.customer.name ?? invoice.customerName;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-lg mb-0.5">{invoice.shop.name}</h1>
        <p className="text-[11px] text-muted mb-4">
          {invoice.shop.address ?? ""}{invoice.shop.phone ? ` · ${invoice.shop.phone}` : ""}
        </p>

        {result === "success" || invoice.paid ? (
          <div className="bg-teal/10 border border-teal/40 rounded-xl p-3 mb-4 text-xs text-teal font-bold text-center">
            ✅ این فاکتور پرداخت شده است
            {invoice.paymentRefId && <div className="font-normal mt-1 mono" dir="ltr">کد رهگیری: {invoice.paymentRefId}</div>}
          </div>
        ) : result === "failed" || result === "error" ? (
          <div className="bg-danger/10 border border-danger/40 rounded-xl p-3 mb-4 text-xs text-danger font-bold text-center">
            پرداخت ناموفق بود — می‌توانید دوباره تلاش کنید
          </div>
        ) : result === "cancelled" ? (
          <div className="bg-amber/10 border border-amber/40 rounded-xl p-3 mb-4 text-xs text-amber font-bold text-center">
            پرداخت لغو شد
          </div>
        ) : null}

        <div className="text-xs space-y-1 mb-3 text-muted">
          {customerLabel && <div>مشتری: <span className="text-ink">{customerLabel}</span></div>}
          {invoice.ticket ? (
            <div>دستگاه: <span className="text-ink">{invoice.ticket.deviceModel}</span> — کد پیگیری #{invoice.ticket.no}</div>
          ) : (
            <div>نوع: <span className="text-ink">خرید کالا</span></div>
          )}
          <div>تاریخ: {new Date(invoice.createdAt).toLocaleDateString("fa-IR")}</div>
        </div>

        <div className="border-t border-surface2 pt-2 text-xs space-y-1.5 mb-3">
          {invoice.laborCost > 0 && (
            <div className="flex justify-between"><span className="text-muted">اجرت تعمیر</span><span className="mono">{invoice.laborCost.toLocaleString("fa-IR")}</span></div>
          )}
          {invoice.items.map((it, idx) => (
            <div key={idx} className="flex justify-between"><span className="text-muted">{it.item.name} × {it.quantity}</span><span className="mono">{it.priceCharged.toLocaleString("fa-IR")}</span></div>
          ))}
          {invoice.ticket && invoice.partsCost > 0 && invoice.items.length === 0 && (
            <div className="flex justify-between"><span className="text-muted">قطعات مصرفی</span><span className="mono">{invoice.partsCost.toLocaleString("fa-IR")}</span></div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between"><span className="text-muted">مالیات ({invoice.taxPercent}٪)</span><span className="mono">{invoice.taxAmount.toLocaleString("fa-IR")}</span></div>
          )}
        </div>

        <div className="flex justify-between font-extrabold text-sm border-t border-surface2 pt-3 mb-4">
          <span>مبلغ قابل پرداخت</span>
          <span className="mono">{invoice.total.toLocaleString("fa-IR")} تومان</span>
        </div>

        {!invoice.paid && (
          <>
            {error && <p className="text-danger text-xs mb-2">{error}</p>}
            <button onClick={pay} disabled={paying}
              className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-3 text-sm disabled:opacity-60">
              {paying ? "در حال انتقال به درگاه..." : "💳 پرداخت آنلاین (زرین‌پال)"}
            </button>
            <p className="text-[10px] text-muted text-center mt-3">
              پس از پرداخت، به همین صفحه برمی‌گردید و وضعیت فاکتور به «پرداخت‌شده» تغییر می‌کند.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
