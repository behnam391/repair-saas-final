import { z } from "zod";
import { type IndustryKey } from "./industry-workspaces";

export const INDUSTRY_FIELDS: Record<IndustryKey, readonly { key: string; label: string; required?: boolean }[]> = {
  appliances: [{ key: "serial", label: "شماره سریال" }, { key: "accessories", label: "لوازم همراه" }, { key: "location", label: "محل تعمیر (تعمیرگاه یا آدرس مشتری)", required: true }],
  facilities: [{ key: "address", label: "آدرس محل خدمت", required: true }, { key: "visit", label: "زمان توافق‌شده مراجعه", required: true }, { key: "serial", label: "شماره سریال تجهیز" }],
  vehicles: [{ key: "plate", label: "پلاک یا شماره شاسی", required: true }, { key: "mileage", label: "کارکرد (کیلومتر)", required: true }, { key: "accessories", label: "متعلقات و وضعیت ظاهری" }],
  industrial: [{ key: "asset", label: "شماره تجهیز", required: true }, { key: "spec", label: "مشخصات فنی (توان، ولتاژ و…)", required: true }, { key: "location", label: "محل نصب" }],
};
export const IndustryDetailsSchema = z.record(z.string().max(500)).optional();
export function industryIntakeNotes(industry: IndustryKey, details: Record<string,string> = {}) {
  return INDUSTRY_FIELDS[industry].map(field => {
    const value = details[field.key]?.trim();
    if (field.required && !value) throw new Error(`${field.label} را وارد کنید`);
    return value ? `${field.label}: ${value}` : "";
  }).filter(Boolean).join("\n");
}
