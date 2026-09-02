"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, ClipboardCheck, Copy, Printer, QrCode, ShieldCheck, Smartphone } from "lucide-react";

type Shop = {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  phone: string | null;
  landlinePhone: string | null;
};

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://peyvo.ir").replace(/\/+$/, "");

export default function QrPosterPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/shop", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("shop_load_failed");
        setShop((await res.json()).shop);
      })
      .catch(() => setError("اطلاعات مغازه دریافت نشد. صفحه را دوباره بارگذاری کنید."));
  }, []);

  const kioskUrl = useMemo(() => shop ? `${APP_ORIGIN}/kiosk/${shop.id}` : "", [shop]);
  const qrSrc = kioskUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=14&data=${encodeURIComponent(kioskUrl)}`
    : "";

  async function copyLink() {
    if (!kioskUrl) return;
    await navigator.clipboard?.writeText(kioskUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (error) return <div className="mx-auto max-w-lg p-8 text-center text-sm text-danger">{error}</div>;
  if (!shop) return <div className="mx-auto max-w-lg p-8 text-center text-sm text-muted">در حال آماده‌سازی پوستر…</div>;

  return (
    <div className="qr-poster-page" dir="rtl">
      <div className="qr-poster-toolbar no-print">
        <div><b>پوستر اختصاصی {shop.name}</b><small>برای ذخیره PDF، در پنجره چاپ گزینه Save as PDF را انتخاب کنید.</small></div>
        <button onClick={copyLink}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "کپی شد" : "کپی لینک"}</button>
        <button className="is-primary" onClick={() => window.print()}><Printer size={18} /> چاپ / ذخیره PDF</button>
      </div>

      <main className="qr-poster-sheet">
        <header className="qr-poster-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo-full.png" alt="Peyvo" />
          <span><ShieldCheck size={18} /> پذیرش دیجیتال و امن</span>
        </header>

        <section className="qr-poster-intro">
          <span>خوش آمدید به</span>
          <h1>{shop.name}</h1>
          <p>برای ثبت سریع مشخصات دستگاه، دوربین گوشی را روی کد زیر بگیرید.</p>
        </section>

        <section className="qr-poster-qr-wrap">
          <div className="qr-poster-corner is-one" /><div className="qr-poster-corner is-two" /><div className="qr-poster-corner is-three" /><div className="qr-poster-corner is-four" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`کد QR پذیرش ${shop.name}`} />
        </section>

        <div className="qr-poster-callout"><QrCode size={22} /><div><b>اسکن کنید و پذیرش را شروع کنید</b><span>بدون نیاز به نصب برنامه</span></div></div>

        <section className="qr-poster-steps">
          <article><i><Smartphone size={21} /></i><b>۱. اسکن کد</b><p>دوربین گوشی را روی QR بگیرید.</p></article>
          <article><i><ClipboardCheck size={21} /></i><b>۲. ثبت مشخصات</b><p>اطلاعات دستگاه و شرح ایراد را بنویسید.</p></article>
          <article><i><BellRing size={21} /></i><b>۳. تأیید پذیرش</b><p>درخواست برای همین تعمیرگاه ارسال می‌شود.</p></article>
        </section>

        {(shop.address || shop.phone || shop.landlinePhone) && <section className="qr-poster-shop-info">
          {shop.address && <span>{shop.province ? `${shop.province} · ` : ""}{shop.address}</span>}
          {(shop.landlinePhone || shop.phone) && <b dir="ltr">{shop.landlinePhone || shop.phone}</b>}
        </section>}

        <footer className="qr-poster-footer">
          <div><b>این مرکز با پیوو مدیریت می‌شود</b><span>سامانه هوشمند مدیریت پذیرش و تعمیرات</span></div>
          <strong dir="ltr">peyvo.ir</strong>
        </footer>
      </main>
    </div>
  );
}
