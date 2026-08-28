"use client";
import { useEffect, useState } from "react";
import { CircleUserRound, Save } from "lucide-react";

export default function SuperAdminProfilePage() {
  const [name, setName] = useState("بهنام شفیعی");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/superadmin/profile").then(r => r.json()).then(d => { if (d.admin) { setName(d.admin.name || "بهنام شفیعی"); setPhone(d.admin.phone); } }); }, []);
  async function save() { setSaving(true); const r = await fetch("/api/superadmin/profile", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name }) }); const d = await r.json(); setMessage(r.ok ? d.message : "ذخیره نام انجام نشد"); setSaving(false); }
  return <div className="min-h-screen p-4 max-w-xl mx-auto"><div className="flex items-center gap-3 mb-6"><span className="w-12 h-12 grid place-items-center rounded-2xl bg-copper/10 text-copper"><CircleUserRound size={23}/></span><div><h1>پروفایل مدیر اصلی</h1><p className="text-xs text-muted">مشخصات نمایش‌داده‌شده در مرکز فرماندهی</p></div></div><div className="super-panel space-y-4"><label className="block text-xs text-muted">نام مدیر<input value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full bg-surface2 border border-border rounded-xl px-3 py-3 text-sm" /></label><label className="block text-xs text-muted">شماره ورود<input value={phone} disabled dir="ltr" className="mt-2 w-full bg-surface2 border border-border rounded-xl px-3 py-3 text-sm opacity-60" /></label><button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 w-full rounded-xl bg-copper text-white py-3 text-sm font-bold"><Save size={17}/>{saving ? "در حال ذخیره..." : "ذخیره نام"}</button>{message && <p className="text-xs text-teal">{message}</p>}</div></div>;
}
