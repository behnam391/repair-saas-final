"use client";

import Link from "next/link";
import EnamadBadge from "./EnamadBadge";
import { useIsNativeApp } from "./NativeAppContext";
import { publicPath, PUBLIC_LANGUAGE_LABELS, type PublicLocale } from "@/lib/public-locale-core";

const labels = {
  fa: { back: "بازگشت به سایت", updated: "آخرین به‌روزرسانی", terms: "قوانین و مقررات", privacy: "حریم خصوصی", refund: "بازگشت وجه", about: "درباره ما" },
  en: { back: "Back to website", updated: "Last updated", terms: "Terms of use", privacy: "Privacy policy", refund: "Refund policy", about: "About us" },
  ar: { back: "العودة إلى الموقع", updated: "آخر تحديث", terms: "شروط الاستخدام", privacy: "سياسة الخصوصية", refund: "سياسة الاسترداد", about: "من نحن" },
} as const;

// Shared shell for the public legal pages (terms / privacy / refund) so they
// share styling and cross-link to each other — the layout payment gateways
// and Enamad expect to find on a real business site.
export default function LegalShell({
  title,
  updated,
  locale = "fa",
  pagePath = "",
  children,
}: {
  title: string;
  updated?: string;
  locale?: PublicLocale;
  pagePath?: string;
  children: React.ReactNode;
}) {
  const isNativeApp = useIsNativeApp();
  const copy = labels[locale];

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto" lang={locale} dir={locale === "en" ? "ltr" : "rtl"}>
      {!isNativeApp && (
        <div className="flex items-center justify-between gap-3">
          <Link href={publicPath(locale)} className="text-xs text-copper">← {copy.back}</Link>
          <div className="home-language" aria-label={locale === "fa" ? "انتخاب زبان" : locale === "ar" ? "اختيار اللغة" : "Choose language"}>
            {(["fa", "en", "ar"] as PublicLocale[]).map((item) => <Link key={item} href={publicPath(item, pagePath)} className={item === locale ? "active" : ""} aria-current={item === locale ? "page" : undefined}>{PUBLIC_LANGUAGE_LABELS[item]}</Link>)}
          </div>
        </div>
      )}
      <h1 className="display-heading text-xl mt-3 mb-1">{title}</h1>
      {updated && <p className="text-[11px] text-muted mb-6">{copy.updated}: {updated}</p>}

      <div className="text-sm leading-8 space-y-5">{children}</div>

      <div className="mt-10 pt-4 border-t border-surface2 flex gap-4 flex-wrap text-xs">
        <Link href={publicPath(locale, "/terms")} className="text-copper">{copy.terms}</Link>
        <Link href={publicPath(locale, "/privacy")} className="text-copper">{copy.privacy}</Link>
        <Link href={publicPath(locale, "/refund")} className="text-copper">{copy.refund}</Link>
        <Link href={publicPath(locale, "/about")} className="text-muted">{copy.about}</Link>
      </div>

      <EnamadBadge className="mt-8" />
    </div>
  );
}

// Small heading used inside the legal documents.
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-bold text-[15px] mb-1.5">{title}</h2>
      <div className="text-muted space-y-2">{children}</div>
    </section>
  );
}
