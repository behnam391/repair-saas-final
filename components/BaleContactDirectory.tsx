"use client";
import { useEffect, useState } from "react";
type Contact = { name: string; phone: string; kind: string; consent: boolean };
export default function BaleContactDirectory({ selected, onChange, audience }: { selected: string[]; onChange: (phones: string[]) => void; audience: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError("");
    try { const r = await fetch("/api/superadmin/bale-campaigns?contacts=1"); if (!r.ok) throw Error(); setContacts((await r.json()).contacts); }
    catch { setError("دریافت دفترچه ممکن نشد"); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = contacts.filter(c => (c.name + c.phone).includes(query) && (audience === "all" || (audience === "shops" ? c.kind.includes("تعمیرگاه") : c.kind.includes("مشتری"))));
  const visible = filtered.slice(0, 100);
  return <div className="border border-border rounded-xl p-3 space-y-3">
    <h3 className="font-bold">دفترچه اعضای پیوو</h3>
    <p className="text-sm text-muted">عضویت در بله هنوز قابل تأیید نیست. رضایت دریافت تبلیغات با عضویت در بله متفاوت است.</p>
    <input aria-label="جست‌وجوی مخاطب" className="w-full bg-surface2 rounded p-3" placeholder="نام یا شماره موبایل…" value={query} onChange={e => setQuery(e.target.value)}/>
    <div className="flex flex-wrap gap-3"><button type="button" className="border rounded p-2" onClick={() => onChange([...new Set([...selected, ...visible.filter(c => c.consent).map(c => c.phone)])])}>انتخاب افراد مجاز این صفحه</button><button type="button" className="border rounded p-2" onClick={() => onChange([])}>پاک‌کردن انتخاب</button><span>{selected.length.toLocaleString("fa-IR")} انتخاب‌شده</span></div>
    {loading ? <p>در حال دریافت دفترچه…</p> : error ? <p role="alert">{error} <button onClick={load}>تلاش دوباره</button></p> : <div className="overflow-x-auto max-h-80"><table className="w-full"><thead><tr><th>انتخاب</th><th>نام / شماره</th><th>نوع عضو</th><th>رضایت تبلیغات</th><th>عضویت بله</th></tr></thead><tbody>{visible.map(c => <tr key={c.phone}><td><input type="checkbox" aria-label={`انتخاب ${c.name}`} disabled={!c.consent} checked={selected.includes(c.phone)} onChange={e => onChange(e.target.checked ? [...new Set([...selected,c.phone])] : selected.filter(p => p !== c.phone))}/></td><td>{c.name}<small dir="ltr">{c.phone}</small></td><td>{c.kind}</td><td>{c.consent ? "مجاز" : "بدون رضایت"}</td><td>نامشخص</td></tr>)}</tbody></table>{!visible.length && <p>مخاطبی پیدا نشد.</p>}</div>}
    {filtered.length > 100 && <p className="text-sm">۱۰۰ نتیجه اول نمایش داده می‌شود؛ برای یافتن افراد دیگر جست‌وجو کنید.</p>}
  </div>;
}
