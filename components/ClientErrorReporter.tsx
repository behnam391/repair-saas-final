"use client";
import { useEffect } from "react";

// Catches errors that React error boundaries DON'T — uncaught exceptions in
// event handlers, async code, and unhandled promise rejections — and reports
// them to POST /api/log-error so they land in the super-admin خطاها panel.
// Mounted once in the root layout. Silent: it never renders anything and
// never lets a reporting failure surface to the user.

// Module-level cap so a page stuck in an error loop can't spam the endpoint.
let sent = 0;
const MAX_PER_LOAD = 12;

function report(payload: Record<string, unknown>) {
  if (sent >= MAX_PER_LOAD) return;
  sent++;
  try {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore — reporting must be invisible
  }
}

export default function ClientErrorReporter() {
  useEffect(() => {
    function onError(e: ErrorEvent) {
      report({
        source: "client",
        level: "error",
        message: e.message || "window.onerror",
        stack: e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`,
        path: window.location.pathname,
      });
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r: any = e.reason;
      report({
        source: "client",
        level: "error",
        message: (r && (r.message || String(r))) || "unhandledrejection",
        stack: r?.stack || null,
        path: window.location.pathname,
      });
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
