"use client";
import { useEffect } from "react";
import WebHomeLink from "@/components/WebHomeLink";

// Route-segment error boundary. Next.js renders this in place of a page
// subtree that threw during render. It reports the error to the خطاها panel
// (POST /api/log-error, source="boundary") and shows a calm Persian fallback
// with a retry button — because it lives inside the root layout, it inherits
// the app's theme, font and glass styling automatically.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "boundary",
          level: "error",
          message: error?.message || "Unhandled render error",
          stack: error?.stack || null,
          digest: error?.digest || null,
          path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // reporting must never itself break the fallback
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center bg-surface border border-surface2 rounded-2xl p-7">
        <div className="text-4xl mb-3">⚠️</div>
        <h1 className="display-heading text-lg mb-1">مشکلی پیش آمد</h1>
        <p className="text-xs text-muted mb-1">
          این صفحه با خطا مواجه شد. خطا برای بررسی ثبت شد.
        </p>
        {error?.digest && (
          <p className="text-[10px] text-muted mono mb-4">کد پیگیری: {error.digest}</p>
        )}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => reset()}
            className="flex-[2] bg-copper text-[#0A0F1E] font-bold rounded-lg py-2.5 text-sm"
          >
            تلاش دوباره
          </button>
          <WebHomeLink
            className="flex-1 bg-surface2 border border-border rounded-lg py-2.5 text-sm flex items-center justify-center"
          >
            خانه
          </WebHomeLink>
        </div>
      </div>
    </div>
  );
}
