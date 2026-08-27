import Link from "next/link";
import EnamadBadge from "./EnamadBadge";
import WebHomeLink from "./WebHomeLink";

// Shared shell for the public legal pages (terms / privacy / refund) so they
// share styling and cross-link to each other — the layout payment gateways
// and Enamad expect to find on a real business site.
export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <WebHomeLink className="text-xs text-copper">← بازگشت به سایت</WebHomeLink>
      <h1 className="display-heading text-xl mt-3 mb-1">{title}</h1>
      {updated && <p className="text-[11px] text-muted mb-6">آخرین به‌روزرسانی: {updated}</p>}

      <div className="text-sm leading-8 space-y-5">{children}</div>

      <div className="mt-10 pt-4 border-t border-surface2 flex gap-4 flex-wrap text-xs">
        <Link href="/terms" className="text-copper">قوانین و مقررات</Link>
        <Link href="/privacy" className="text-copper">حریم خصوصی</Link>
        <Link href="/refund" className="text-copper">بازگشت وجه</Link>
        <Link href="/about" className="text-muted">درباره ما</Link>
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
