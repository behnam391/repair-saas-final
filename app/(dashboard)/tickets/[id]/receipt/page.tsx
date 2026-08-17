"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatJalaliDate } from "@/lib/jalali";

type IntakeReceipt = {
  id: string; no: number; deviceModel: string; imei: string | null; issueInitial: string;
  customerDamageNotes: string | null; receiptAck: string | null; intakeSource: string;
  partnerName: string | null; partnerPhone: string | null; createdAt: string;
  customer: { name: string; phone: string };
  shop: { name: string; phone: string | null; landlinePhone: string | null; address: string | null };
};

const ACK_LABEL: Record<string, string> = {
  SHOP_PRINTED_SIGNED: "رسید چاپی مغازه توسط مشتری امضا شد",
  SITE_PRINTED_SIGNED: "رسید سامانه توسط مشتری امضا شد",
  NO_SIGNATURE: "پذیرش بدون امضا ثبت شد",
};

export default function IntakeReceiptPage() {
  const id = useParams().id as string;
  const [ticket, setTicket] = useState<IntakeReceipt | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/tickets/${id}`, { cache: "no-store" }).then(async (res) => {
      if (!res.ok) { setNotFound(true); return; }
      setTicket((await res.json()).ticket);
    });
  }, [id]);

  if (notFound) return <div className="p-8 text-center text-sm text-muted">رسید پیدا نشد یا اجازه مشاهده ندارید.</div>;
  if (!ticket) return <div className="p-8 text-center text-sm text-muted">در حال آماده‌سازی رسید...</div>;

  return (
    <div className="mx-auto max-w-lg p-5 print:p-0" dir="rtl">
      <div className="no-print mb-4 flex gap-2 justify-end">
        <button onClick={() => window.print()} className="rounded-lg bg-copper px-4 py-2 text-sm font-bold text-[#1A1410]">🖨 چاپ رسید</button>
        <button onClick={() => window.close()} className="rounded-lg border border-surface2 bg-surface px-4 py-2 text-xs">بستن</button>
      </div>

      <article className="rounded-xl border border-gray-300 bg-white p-6 text-black">
        <header className="text-center">
          <h1 className="text-xl font-extrabold">{ticket.shop.name}</h1>
          {ticket.shop.address && <p className="mt-1 text-xs text-gray-600">{ticket.shop.address}</p>}
          <p className="text-xs text-gray-600">{[ticket.shop.phone, ticket.shop.landlinePhone].filter(Boolean).join(" · ")}</p>
          <div className="my-4 border-y border-gray-300 py-2 text-sm font-bold">رسید پذیرش دستگاه · کد پیگیری #{ticket.no}</div>
        </header>

        <section className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div><span className="text-gray-500">مشتری:</span> {ticket.customer.name}</div>
          <div><span className="text-gray-500">شماره تماس:</span> <span dir="ltr">{ticket.customer.phone}</span></div>
          <div><span className="text-gray-500">دستگاه:</span> {ticket.deviceModel}</div>
          <div><span className="text-gray-500">تاریخ پذیرش:</span> {formatJalaliDate(ticket.createdAt)}</div>
          {ticket.imei && <div className="col-span-2"><span className="text-gray-500">IMEI:</span> <span dir="ltr">{ticket.imei}</span></div>}
          {ticket.intakeSource === "PARTNER" && (
            <div className="col-span-2 rounded-lg bg-gray-100 p-2"><span className="text-gray-500">تحویل از همکار:</span> {ticket.partnerName}{ticket.partnerPhone ? ` · ${ticket.partnerPhone}` : ""}</div>
          )}
        </section>

        <section className="mt-4 rounded-lg border border-gray-300 p-3 text-xs">
          <b>شرح ایراد اعلام‌شده</b>
          <p className="mt-1 leading-6">{ticket.issueInitial}</p>
          {ticket.customerDamageNotes && <p className="mt-2 border-t border-gray-200 pt-2"><b>وضعیت ظاهری/سابقه:</b> {ticket.customerDamageNotes}</p>}
        </section>

        <p className="mt-3 text-[10px] text-gray-600">{ACK_LABEL[ticket.receiptAck || ""] ?? "نحوه تأیید پذیرش ثبت نشده است"}</p>
        <div className="mt-12 grid grid-cols-2 gap-10 text-center text-xs">
          <div className="border-t border-gray-400 pt-2">امضا و مهر تعمیرگاه</div>
          <div className="border-t border-gray-400 pt-2">امضای تحویل‌دهنده</div>
        </div>
        <p className="mt-8 text-center text-[9px] text-gray-400">این رسید توسط سامانه پیوو صادر شده است.</p>
      </article>

      <style jsx global>{`@media print { .no-print { display:none!important } body { background:white!important } }`}</style>
    </div>
  );
}
