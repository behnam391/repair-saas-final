"use client";

import { useEffect, useState } from "react";
import { ContactRound, Search, Store, X } from "lucide-react";
import { canPickNativeContact, pickNativeContact } from "@/lib/native-contacts";
import { toLatinDigits } from "@/lib/phone";

type Partner = { name: string; phone: string };

export default function PartnerQuickPick({ value, onChange }: { value: Partner; onChange: (partner: Partner) => void }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setNativeAvailable(canPickNativeContact()), []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const query = value.name.trim() || value.phone.trim();
        const response = await fetch(`/api/partners?q=${encodeURIComponent(query)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        setResults((await response.json()).partners ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("دفترچه همکاران دریافت نشد");
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [open, value.name, value.phone]);

  async function choosePhoneContact() {
    setError("");
    try {
      const person = await pickNativeContact();
      onChange({ name: person.name, phone: person.phone });
      setOpen(false);
    } catch (e: any) {
      if (e?.code !== "CONTACT_CANCELLED") setError(e?.message || "انتخاب مخاطب ناموفق بود");
    }
  }

  return <div>
    <div className="mb-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex items-center gap-1.5 rounded-lg border border-surface2 bg-surface px-3 py-2 text-[11px] font-bold text-teal">
        <Search size={14} /> دفترچه همکاران
      </button>
      {nativeAvailable && <button type="button" onClick={choosePhoneContact} className="flex items-center gap-1.5 rounded-lg border border-surface2 bg-surface px-3 py-2 text-[11px] font-bold text-copper">
        <ContactRound size={14} /> مخاطبین گوشی
      </button>}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <input value={value.name} onFocus={() => setOpen(true)} onChange={(event) => { onChange({ ...value, name: event.target.value }); setOpen(true); }} placeholder="نام همکار یا مغازه" className="min-w-0 rounded-lg border border-surface2 bg-surface px-3 py-2 text-xs" />
      <input value={value.phone} onFocus={() => setOpen(true)} onChange={(event) => { onChange({ ...value, phone: toLatinDigits(event.target.value) }); setOpen(true); }} placeholder="شماره همکار" inputMode="tel" dir="ltr" maxLength={11} className="min-w-0 rounded-lg border border-surface2 bg-surface px-3 py-2 text-xs mono" />
    </div>
    {open && <div className="relative z-20 mt-2 rounded-xl border border-border bg-surface p-2 shadow-xl">
      <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-muted"><span>همکاران ثبت‌شده قبلی</span><button type="button" onClick={() => setOpen(false)}><X size={14} /></button></div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {loading && <p className="py-2 text-center text-[10px] text-muted">در حال جستجو...</p>}
        {!loading && results.map((partner, index) => <button key={`${partner.name}-${partner.phone}-${index}`} type="button" onClick={() => { onChange(partner); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg bg-surface2 px-3 py-2 text-right hover:bg-teal/10">
          <Store size={14} className="text-teal" /><span className="min-w-0 flex-1"><b className="block truncate text-xs">{partner.name}</b><small className="mono text-[10px] text-muted">{partner.phone || "بدون شماره"}</small></span>
        </button>)}
        {!loading && results.length === 0 && <p className="py-2 text-center text-[10px] text-muted">همکار ثبت‌شده‌ای پیدا نشد؛ مشخصات جدید را وارد کنید.</p>}
      </div>
    </div>}
    {error && <p className="mt-1 text-[10px] text-danger">{error}</p>}
  </div>;
}
