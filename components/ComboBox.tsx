"use client";
/**
 * Searchable combo box: type to filter the option list, tap to pick — or
 * just keep typing to enter a value that isn't in the list (free text).
 * Used everywhere a brand/model is chosen (shop intake, QR kiosk) so users
 * never hit a dead-end "not in the list" state.
 */
import { useEffect, useRef, useState } from "react";

export default function ComboBox({
  value,
  onChange,
  options,
  placeholder = "انتخاب یا تایپ کنید...",
  className = "",
  starred = [],
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  /** Options pinned to the top with a star (e.g. favorite brands). */
  starred?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options;
  const exactMatch = options.some((o) => o.toLowerCase() === q);

  return (
    <div ref={ref} className="relative">
      <input
        className={className || "w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[10px]">▼</span>

      {open && (filtered.length > 0 || (q && !exactMatch)) && (
        <div
          className="absolute z-[100] mt-1 inset-x-0 rounded-xl border border-border shadow-2xl max-h-52 overflow-y-auto"
          style={{ background: "var(--glass-sheet)", backdropFilter: "blur(20px) saturate(1.5)" }}
        >
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-right px-3 py-2 text-xs hover:bg-surface2 ${o === value ? "text-copper font-bold" : ""}`}
            >
              {starred.includes(o) ? "⭐ " : ""}{o}
            </button>
          ))}
          {q && !exactMatch && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full text-right px-3 py-2 text-xs text-teal border-t border-border"
            >
              ✍️ ثبت دستی: «{value}»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
