"use client";

import { useEffect, useState } from "react";
import { ContactRound, Search, UserRound, X } from "lucide-react";
import { canPickNativeContact, pickNativeContact } from "@/lib/native-contacts";

type PickedPerson = { name: string; phone: string };
type CustomerResult = PickedPerson & { id: string };

export default function CustomerQuickPick({
  onSelect,
  allowCustomerBook = true,
}: {
  onSelect: (person: PickedPerson) => void;
  allowCustomerBook?: boolean;
}) {
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setNativeAvailable(canPickNativeContact()), []);

  useEffect(() => {
    if (!open || !allowCustomerBook) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers?page=1&pageSize=8&q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (res.ok) setResults((await res.json()).customers ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("دفترچه مشتریان دریافت نشد");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [open, query, allowCustomerBook]);

  async function pickContact() {
    setError("");
    try {
      const person = await pickNativeContact();
      if (!person.phone) {
        setError("این مخاطب شماره تماس ندارد");
        return;
      }
      onSelect(person);
      setOpen(false);
    } catch (e: any) {
      if (e?.code !== "CONTACT_CANCELLED") setError(e?.message || "انتخاب مخاطب ناموفق بود");
    }
  }

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        {allowCustomerBook && (
          <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-1.5 rounded-lg border border-surface2 bg-surface px-3 py-2 text-[11px] font-bold text-copper">
            <Search size={14} /> انتخاب از دفترچه مشتریان
          </button>
        )}
        {nativeAvailable && (
          <button type="button" onClick={pickContact} className="flex items-center gap-1.5 rounded-lg border border-surface2 bg-surface px-3 py-2 text-[11px] font-bold text-teal">
            <ContactRound size={14} /> مخاطبین گوشی
          </button>
        )}
      </div>

      {open && allowCustomerBook && (
        <div className="mt-2 rounded-xl border border-border bg-surface p-2.5 shadow-xl">
          <div className="flex items-center gap-2 rounded-lg border border-surface2 bg-surface2 px-2.5">
            <Search size={14} className="text-muted" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="نام یا شماره مشتری..." className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none" />
            <button type="button" onClick={() => setOpen(false)}><X size={14} className="text-muted" /></button>
          </div>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {loading && <p className="py-2 text-center text-[10px] text-muted">در حال جستجو...</p>}
            {!loading && results.map((customer) => (
              <button key={customer.id} type="button" onClick={() => { onSelect(customer); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg bg-surface2 px-3 py-2 text-right hover:bg-copper/10">
                <UserRound size={15} className="text-copper" />
                <span className="min-w-0 flex-1"><b className="block truncate text-xs">{customer.name}</b><small className="mono text-[10px] text-muted">{customer.phone}</small></span>
              </button>
            ))}
            {!loading && results.length === 0 && <p className="py-2 text-center text-[10px] text-muted">مشتری‌ای پیدا نشد.</p>}
          </div>
        </div>
      )}
      {error && <p className="mt-1.5 text-[10px] text-danger">{error}</p>}
    </div>
  );
}
