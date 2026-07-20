"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type InvoiceDetail = {
  id: string; type: string; laborCost: number; partsCost: number; taxPercent: number; taxAmount: number; total: number; paid: boolean; createdAt: string;
  customerName: string | null; customerPhone: string | null;
  shop: { name: string; address: string | null; phone: string | null; bankCardNumber: string | null; bankAccountNumber: string | null };
  ticket: {
    no: number; deviceModel: string; imei: string | null; issueInitial: string;
    customer: { name: string; phone: string };
    partsUsed: { quantity: number; priceCharged: number; item: { name: string } }[];
  } | null;
  items: { quantity: number; priceCharged: number; item: { name: string } }[];
};

export default function PrintInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`).then((r) => r.json()).then((d) => setInvoice(d.invoice));
  }, [id]);

  if (!invoice) return <div className="p-8 text-center text-sm text-muted">در حال بارگذاری...</div>;

  return (
    <div className="max-w-lg mx-auto p-6 print:p-0" dir="rtl">
      <div className="no-print flex justify-end mb-4">
        <button onClick={() => window.print()} className="bg-copper text-[#1A1410] font-bold rounded-lg px-4 py-2 text-sm">
          🖨 چاپ فاکتور
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg p-6 text-black bg-white">
        <div className="text-center mb-4">
          <div className="text-lg font-extrabold">{invoice.shop.name}</div>
          {invoice.shop.address && <div className="text-xs text-gray-600 mt-1">{invoice.shop.address}</div>}
          {invoice.shop.phone && <div className="text-xs text-gray-600">{invoice.shop.phone}</div>}
        </div>
        <div className="border-t border-b border-gray-300 py-2 my-3 flex justify-between text-xs">
          <span>شماره فاکتور: {invoice.id.slice(0, 8)}</span>
          <span>تاریخ: {new Date(invoice.createdAt).toLocaleDateString("fa-IR")}</span>
        </div>

        <div className="text-xs mb-3 space-y-1">
          {invoice.ticket ? (
            <>
              <div>مشتری: {invoice.ticket.customer.name} ({invoice.ticket.customer.phone})</div>
              <div>دستگاه: {invoice.ticket.deviceModel} — کد پیگیری #{invoice.ticket.no}</div>
              {invoice.ticket.imei && <div>IMEI: {invoice.ticket.imei}</div>}
              <div>شرح: {invoice.ticket.issueInitial}</div>
            </>
          ) : (
            <>
              <div>نوع فاکتور: فروش کالا</div>
              {(invoice.customerName || invoice.customerPhone) && (
                <div>مشتری: {invoice.customerName ?? ""}{invoice.customerPhone ? ` (${invoice.customerPhone})` : ""}</div>
              )}
            </>
          )}
        </div>

        <table className="w-full text-xs border-collapse mb-3">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-right py-1">شرح</th>
              <th className="text-left py-1">مبلغ (تومان)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.laborCost > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-1">اجرت تعمیر</td>
                <td className="text-left py-1">{invoice.laborCost.toLocaleString("fa-IR")}</td>
              </tr>
            )}
            {(invoice.ticket?.partsUsed ?? []).map((p, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-1">{p.item.name} × {p.quantity}</td>
                <td className="text-left py-1">{p.priceCharged.toLocaleString("fa-IR")}</td>
              </tr>
            ))}
            {invoice.items.map((p, i) => (
              <tr key={`s${i}`} className="border-b border-gray-200">
                <td className="py-1">{p.item.name} × {p.quantity}</td>
                <td className="text-left py-1">{p.priceCharged.toLocaleString("fa-IR")}</td>
              </tr>
            ))}
            {invoice.taxAmount > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-1">مالیات ({invoice.taxPercent}٪)</td>
                <td className="text-left py-1">{invoice.taxAmount.toLocaleString("fa-IR")}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-2">
          <span>جمع کل</span>
          <span>{invoice.total.toLocaleString("fa-IR")} تومان</span>
        </div>
        <div className="text-xs text-gray-600 mt-1">وضعیت پرداخت: {invoice.paid ? "پرداخت‌شده" : "پرداخت‌نشده"}</div>

        {(invoice.shop.bankCardNumber || invoice.shop.bankAccountNumber) && (
          <div className="text-xs text-gray-600 mt-3 border-t border-gray-300 pt-2">
            {invoice.shop.bankCardNumber && <div>شماره کارت: {invoice.shop.bankCardNumber}</div>}
            {invoice.shop.bankAccountNumber && <div>شماره حساب: {invoice.shop.bankAccountNumber}</div>}
          </div>
        )}

        <div className="text-center text-[10px] text-gray-400 mt-6">با تشکر از اعتماد شما</div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
