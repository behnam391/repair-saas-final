"use client";

import { ArrowUpRight } from "lucide-react";
import { usePanelI18n } from "@/lib/panel-i18n";
import { useEffect, useState } from "react";

const copy = {
  fa: { title: "پیوو در بله، همیشه در دسترس", customer: "فاکتور و خبر آماده‌شدن دستگاه را در بله دریافت کنید؛ پیگیری تعمیرات راحت‌تر می‌شود.", shop: "بازوی پیوو را در بله باز کنید و به مشتری‌ها معرفی کنید تا فاکتور و اعلان تعمیر را همان‌جا دریافت کنند.", public: "فاکتور و اعلان‌های تعمیر را در بله دریافت کنید و ارتباط نزدیک‌تری با پیوو داشته باشید.", action: "باز کردن پیوو در بله", offers: "دریافت پیشنهادهای ویژه، اختیاری و از تنظیمات پروفایل قابل فعال‌سازی است.", settings: "تنظیم دریافت پیشنهادها" },
  en: { title: "Stay connected with Peyvo on Bale", customer: "Receive your invoice and repair-ready notifications on Bale for easier tracking.", shop: "Open Peyvo on Bale and introduce it to your customers so they can receive invoices and repair updates there.", public: "Receive invoices and repair notifications on Bale and stay connected with Peyvo.", action: "Open Peyvo on Bale", offers: "Special offers are optional. Enable them in your profile settings.", settings: "Offer preferences" },
  ar: { title: "ابقَ على تواصل مع Peyvo عبر بله", customer: "استلم فاتورتك وإشعار جاهزية جهازك عبر بله لتسهيل متابعة الإصلاح.", shop: "افتح Peyvo في بله وعرّفه لعملائك لاستلام الفواتير وإشعارات الإصلاح هناك.", public: "استلم الفواتير وإشعارات الإصلاح عبر بله وابقَ على تواصل مع Peyvo.", action: "فتح Peyvo في بله", offers: "العروض الخاصة اختيارية؛ يمكنك تفعيلها من إعدادات ملفك.", settings: "إعدادات العروض" },
};

export default function BaleInvite({ audience = "public", locale }: { audience?: "public" | "shop" | "customer"; locale?: "fa" | "en" | "ar" }) {
  const panel = usePanelI18n();
  const text = copy[locale ?? panel.locale];
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { try { setDismissed(localStorage.getItem(`bale-invite-hidden:${audience}`) === "1"); } catch {} }, [audience]);
  if (audience !== "public") {
    if (dismissed) return null;
    return <div className="bale-compact no-print"><img src="/images/trust/bale.webp" width={24} height={24} alt="بله"/><a href="https://ble.ir/peyvo_bale_bot" target="_blank" rel="noopener noreferrer">{text.action}</a><span>{text[audience]}</span><button aria-label="بستن پیشنهاد بله" onClick={() => { setDismissed(true); try {localStorage.setItem(`bale-invite-hidden:${audience}`,"1");} catch {} }}>×</button></div>;
  }
  return <section className="no-print my-4 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-4" aria-label={text.title}>
    <img src="/images/trust/bale.webp" width={48} height={48} alt="بله" className="h-12 w-12 shrink-0 rounded-xl" loading="lazy" decoding="async" />
    <div className="min-w-0 flex-1 basis-52"><h2 className="text-base font-bold">{text.title}</h2><p className="mt-1 text-sm leading-7 text-muted">{text[audience]}</p><p className="mt-1 text-xs leading-6 text-muted">{text.offers}</p></div>
    <div className="flex flex-col gap-2 w-full sm:w-auto"><a href="https://ble.ir/peyvo_bale_bot" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">{text.action}<ArrowUpRight size={17} aria-hidden="true" /></a>{audience !== "public" && <a className="text-center text-sm text-copper py-2" href={audience === "customer" ? "/customer/profile" : "/profile"}>{text.settings}</a>}</div>
  </section>;
}
