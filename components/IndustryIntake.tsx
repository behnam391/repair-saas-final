"use client";
import { useState } from "react";
import { INDUSTRY_WORKSPACES, type IndustryKey } from "@/lib/industry-workspaces";
import { INDUSTRY_FIELDS } from "@/lib/industry-intake";
import { normalizePhone, isValidMobile } from "@/lib/phone";

export default function IndustryIntake({ industry, onCreated, demo = false }: { industry: IndustryKey; onCreated: () => void; demo?: boolean }) {
  const config = INDUSTRY_WORKSPACES[industry];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = (key: string) => String(values.get(key) || "").trim();
    if (!isValidMobile(text("phone"))) { setError("شماره موبایل معتبر وارد کنید"); return; }
    if (demo) { setError("این فرم نمایشی است؛ هیچ پرونده یا پیامکی ثبت و ارسال نمی‌شود."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customerName: text("customer"), customerPhone: normalizePhone(text("phone")), deviceCategory: config.category,
        deviceModel: `${text("type")} — ${text("model")}`, deviceBrand: text("brand"), issueInitial: text("issue"), lane: "HARDWARE",
        industryDetails: Object.fromEntries(INDUSTRY_FIELDS[industry].map(field => [field.key, text(field.key)])),
      }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || "ثبت پذیرش انجام نشد؛ دوباره تلاش کنید");
      form.reset(); onCreated();
    } catch (error) { setError(error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد"); }
    finally { setBusy(false); }
  }
  return <section className="industry-panel"><h2>پذیرش جدید · {config.title}</h2><p className="industry-muted">فیلدهای ستاره‌دار الزامی‌اند. پس از ثبت، پیامک پذیرش برای مشتری ارسال می‌شود.</p>
    <form onSubmit={submit} className="industry-intake">
      <label>نام مشتری یا کارفرما *<input name="customer" required maxLength={120} autoComplete="name" /></label>
      <label>موبایل مشتری *<input name="phone" required inputMode="tel" dir="ltr" autoComplete="tel" maxLength={15}/></label>
      <label>نوع {config.assetLabel} *<select name="type" required><option value="">انتخاب کنید</option>{config.examples.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>مدل / مشخصات *<input name="model" required maxLength={120}/></label>
      <label>برند / سازنده<input name="brand" maxLength={80}/></label>
      {INDUSTRY_FIELDS[industry].map(field => <label key={field.key}>{field.label}{field.required ? " *" : ""}<input name={field.key} required={field.required} maxLength={500}/></label>)}
      <label className="industry-wide">شرح ایراد و درخواست مشتری *<textarea name="issue" required maxLength={2000} rows={3}/></label>
      {error && <p role="alert" className="industry-wide industry-error">{error}</p>}
      <button disabled={busy} type="submit">{busy ? "در حال ثبت…" : demo ? "بررسی فرم نمونه" : "ثبت پذیرش و ارسال پیامک"}</button>
    </form></section>;
}
