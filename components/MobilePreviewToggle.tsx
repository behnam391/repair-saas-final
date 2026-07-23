"use client";
/**
 * Desktop-only "view as phone" toggle. Because Tailwind's responsive
 * breakpoints follow the VIEWPORT width, the only faithful way to preview
 * the real mobile layout on a wide screen is to render the same page inside
 * a narrow iframe — the iframe gets its own ~390px viewport, so the app
 * renders exactly as it would on a phone. Hidden on real phones.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function MobilePreviewToggle() {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  const pathname = usePathname();

  // Point the iframe at the current path each time it opens.
  useEffect(() => {
    if (open) setSrc(window.location.pathname + window.location.search);
  }, [open, pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="نمای موبایل"
        aria-label="نمای موبایل"
        className="hidden md:flex items-center justify-center fixed bottom-5 right-5 z-[400]
                   w-11 h-11 bg-surface2 border border-border rounded-full text-lg shadow-lg
                   hover:border-copper transition opacity-60 hover:opacity-100"
        style={{ backdropFilter: "blur(12px)" }}
      >
        📱
      </button>

      {open && (
        <div className="hidden md:flex fixed inset-0 z-[500] bg-black/70 items-center justify-center flex-col gap-3"
          onClick={() => setOpen(false)}>
          {/* Phone frame */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-[2.2rem] border-[10px] border-[#111] shadow-2xl overflow-hidden bg-black"
            style={{ width: 400, height: 820 }}
          >
            {src && <iframe src={src} title="نمای موبایل" className="w-full h-full border-0 bg-white" />}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="bg-surface2 border border-border rounded-full px-5 py-2 text-xs font-bold text-ink"
          >
            ✕ بستن نمای موبایل
          </button>
        </div>
      )}
    </>
  );
}
