"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Rocket, X } from "lucide-react";

export type OnboardingItem = { label: string; href: string; done: boolean };
export default function OnboardingChecklist({ items }: { items: OnboardingItem[] }) {
  const [hidden, setHidden] = useState(false);
  const done = items.filter((item) => item.done).length;
  if (hidden || done === items.length) return null;
  return <section className="onboarding-card no-print"><button className="onboarding-close" onClick={() => setHidden(true)} aria-label="بستن راهنمای شروع"><X size={15} /></button><div className="onboarding-intro"><i><Rocket size={20} /></i><div><span>شروع سریع پیوو</span><strong>فضای کاری‌تان را کامل کنید</strong><small>{done} از {items.length} مرحله انجام شده</small></div><em>{Math.round(done / items.length * 100)}٪</em></div><div className="onboarding-progress"><i style={{ width: `${done / items.length * 100}%` }} /></div><div className="onboarding-items">{items.map((item) => <Link key={item.label} href={item.href} className={item.done ? "done" : ""}><i>{item.done ? <Check size={13} /> : <ChevronLeft size={13} />}</i>{item.label}</Link>)}</div></section>;
}
