"use client";
import { usePanelI18n } from "@/lib/panel-i18n";
export default function ListPagination({ page, total, pageSize = 25, loading, onChange }: { page: number; total: number; pageSize?: number; loading: boolean; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const { locale } = usePanelI18n();
  const numberLocale = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar" : "en";
  return <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-3 py-4 text-sm">
    <button className="border rounded-lg px-3 py-2 disabled:opacity-40" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>قبلی</button>
    <span aria-live="polite">{locale === "en" ? "Page" : locale === "ar" ? "صفحة" : "صفحه"} {page.toLocaleString(numberLocale)} / {pages.toLocaleString(numberLocale)}</span>
    <button className="border rounded-lg px-3 py-2 disabled:opacity-40" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}>بعدی</button>
  </nav>;
}
