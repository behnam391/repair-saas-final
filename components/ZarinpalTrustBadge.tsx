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
        <span className="zarinpal-logo-frame">
          <img src="https://cdn.zarinpal.com/badges/trustLogo/1.png" alt="درگاه پرداخت معتبر زرین‌پال" width="60" height="85" />
        </span>
      </a>
    </div>
  );
}
