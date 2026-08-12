import { headers } from "next/headers";

export default function ZarinpalTrustBadge() {
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = (forwardedHost || requestHeaders.get("host") || "")
    .split(",")[0]
    .trim()
    .replace(/:\d+$/, "");
  const trustUrl = host
    ? `https://www.zarinpal.com/trustPage/${encodeURIComponent(host)}`
    : "https://www.zarinpal.com/";

  return (
    <div className="zarinpal-prominent">
      <a href={trustUrl} target="_blank" rel="noopener" aria-label="مشاهده اعتبار درگاه پرداخت زرین‌پال پیوو">
        <img src="https://cdn.zarinpal.com/badges/trustLogo/1.svg" alt="درگاه پرداخت معتبر زرین‌پال" width="118" height="118" />
      </a>
    </div>
  );
}
