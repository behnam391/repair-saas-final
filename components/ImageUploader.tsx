"use client";
import { useRef, useState } from "react";

/**
 * Real file upload for images. Picks a local file, POSTs it to /api/upload
 * (Vercel Blob in production, ./public/uploads in dev) and hands the final
 * URL back via onChange. A plain URL input is still offered as a fallback
 * for people who prefer pasting a link.
 */
export default function ImageUploader({
  value,
  onChange,
  label = "تصویر",
  showUrlInput = true,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  showUrlInput?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  async function handleFile(file: File) {
    setError(""); setWarning(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || `آپلود ناموفق بود (خطای سرور ${res.status}) — لاگ ترمینال سرور را ببینید`);
      } else {
        onChange(data.url);
        if (data.warning) setWarning(data.warning);
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    }
    setUploading(false);
  }

  return (
    <div className="mb-3">
      <label className="block text-xs text-muted mb-1">{label}</label>

      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg bg-surface2 border border-surface2 overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted text-xl">🖼</span>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60"
            >
              {uploading ? "در حال آپلود..." : "📤 انتخاب و آپلود تصویر"}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-danger text-xs">
                حذف ✕
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted mt-1">JPG / PNG / WebP / GIF — حداکثر ۴ مگابایت</p>
        </div>
      </div>

      {showUrlInput && (
        <input
          className="w-full bg-surface2 rounded-lg px-3 py-2 text-xs mono mt-2"
          placeholder="یا لینک مستقیم تصویر را اینجا بچسبانید https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
        />
      )}

      {error && <p className="text-danger text-[11px] mt-1">{error}</p>}
      {warning && <p className="text-amber text-[10px] mt-1">{warning}</p>}
    </div>
  );
}
