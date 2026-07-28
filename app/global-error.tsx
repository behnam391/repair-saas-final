"use client";
import { useEffect } from "react";

// Root error boundary — the last line of defense. Next.js renders this ONLY
// when the root layout itself throws, which means it fully REPLACES that
// layout: globals.css and the theme/font wiring are not guaranteed here, so
// everything is inline-styled and it renders its own <html>/<body>.
// It still reports to the خطاها panel (level="fatal") on a best-effort basis.
export default function GlobalError({
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
          level: "fatal",
          message: error?.message || "Fatal root error",
          stack: error?.stack || null,
          digest: error?.digest || null,
          path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0F1E",
          color: "#F2F6FC",
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "22rem",
            width: "100%",
            textAlign: "center",
            background: "rgba(148,178,255,0.07)",
            border: "1px solid rgba(160,190,255,0.16)",
            borderRadius: "1rem",
            padding: "1.75rem",
          }}
        >
          <div style={{ fontSize: "2.25rem", marginBottom: ".75rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 .25rem" }}>
            خطای غیرمنتظره
          </h1>
          <p style={{ fontSize: ".75rem", color: "#94A4C2", margin: "0 0 1.25rem" }}>
            برنامه با خطای جدی مواجه شد. خطا ثبت شد؛ لطفاً دوباره تلاش کنید.
          </p>
          <button
            onClick={() => reset()}
            style={{
              width: "100%",
              background: "#35A9FF",
              color: "#0A0F1E",
              fontWeight: 700,
              border: "none",
              borderRadius: ".5rem",
              padding: ".65rem",
              fontSize: ".875rem",
              cursor: "pointer",
            }}
          >
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  );
}
