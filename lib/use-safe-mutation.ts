"use client";
import { useRef, useState } from "react";

/** Never clears the caller's form or retries an uncertain write automatically. */
export function useSafeMutation() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(url: string, method: string, body?: unknown) {
    if (locked.current) return false;
    locked.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(typeof result.message === "string" ? result.message : "عملیات انجام نشد؛ اطلاعات فرم حفظ شده است.");
        return false;
      }
      return true;
    } catch {
      setError("پاسخ عملیات دریافت نشد؛ قبل از تکرار، نتیجه را بررسی کنید. اطلاعات فرم حفظ شده است.");
      return false;
    } finally { locked.current = false; setBusy(false); }
  }
  return { run, busy, error, clearError: () => setError("") };
}
