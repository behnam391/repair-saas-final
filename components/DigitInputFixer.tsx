"use client";
/**
 * Global keyboard shim: converts Persian/Arabic digits to Latin AS THEY ARE
 * TYPED into numeric-ish inputs (type=number/tel, or inputMode numeric/
 * decimal/tel), app-wide. Without this, Farsi keyboards make number fields
 * appear dead (type=number rejects "۱") and phone fields store Persian
 * digits that later fail lookups. Mounted once in the root layout.
 */
import { useEffect } from "react";

const MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export default function DigitInputFixer() {
  useEffect(() => {
    function onBeforeInput(e: Event) {
      const ev = e as InputEvent;
      const t = ev.target as HTMLInputElement | null;
      if (!t || t.tagName !== "INPUT") return;
      const mode = (t.getAttribute("inputmode") || "").toLowerCase();
      const type = (t.type || "").toLowerCase();
      const numericHost =
        type === "number" || type === "tel" || ["numeric", "decimal", "tel"].includes(mode);
      if (!numericHost) return;
      const data = ev.data;
      if (!data || !/[۰-۹٠-٩]/.test(data)) return;

      ev.preventDefault();
      const converted = data.replace(/[۰-۹٠-٩]/g, (d) => MAP[d] ?? d);
      // Use the native value setter so React's controlled-input onChange fires.
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (!setter) return;
      if (type === "number") {
        // number inputs don't support the selection API — append.
        setter.call(t, (t.value || "") + converted);
      } else {
        const start = t.selectionStart ?? t.value.length;
        const end = t.selectionEnd ?? t.value.length;
        setter.call(t, t.value.slice(0, start) + converted + t.value.slice(end));
        try { t.setSelectionRange(start + converted.length, start + converted.length); } catch {}
      }
      t.dispatchEvent(new Event("input", { bubbles: true }));
    }
    document.addEventListener("beforeinput", onBeforeInput, true);
    return () => document.removeEventListener("beforeinput", onBeforeInput, true);
  }, []);
  return null;
}
