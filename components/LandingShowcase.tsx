"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Cpu, Megaphone, Sparkles, type LucideIcon } from "lucide-react";

type Slide = { kicker: string; title: string; text: string; cta: string; href: string; icon: LucideIcon; className: string; imageUrl?: string };
type Campaign = { id: string; imageUrl: string; linkUrl: string | null; title: string | null; description: string | null; ctaLabel: string | null };
const defaults: Slide[] = [
  { kicker: "PEYVO INTELLIGENCE", title: "هر تعمیر، یک تصمیم هوشمندتر.", text: "جریان کار و وضعیت دستگاه‌ها را در یک نگاه ببینید و قبل از ایجاد گلوگاه اقدام کنید.", cta: "شروع تجربه هوشمند", href: "/signup", icon: Cpu, className: "is-cinematic" },
  { kicker: "کمپین ویژه تعمیرگاه‌ها", title: "تبلیغ بعدی شما، همین‌جا می‌درخشد.", text: "فضایی آماده برای جشنواره‌ها، امکانات جدید، تخفیف اشتراک یا همکاری با برندها.", cta: "مشاهده امکانات", href: "#features", icon: Megaphone, className: "is-campaign" },
  { kicker: "یک شروع بدون ریسک", title: "رایگان شروع کن؛ حرفه‌ای رشد کن.", text: "بدون نصب و هزینه اولیه تعمیرگاهت را بساز و هر زمان آماده بودی امکانات بیشتری فعال کن.", cta: "ساخت حساب رایگان", href: "/signup", icon: Sparkles, className: "is-growth" },
];

export default function LandingShowcase() {
  const [active, setActive] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  useEffect(() => { fetch("/api/public/campaigns").then((r) => r.ok ? r.json() : { campaigns: [] }).then((d) => setCampaigns(d.campaigns || [])).catch(() => undefined); }, []);
  const slides = useMemo<Slide[]>(() => [
    ...campaigns.map((c) => ({ kicker: "پیشنهاد ویژه پیوو", title: c.title || "یک پیشنهاد تازه برای تعمیرگاه شما", text: c.description || "جزئیات این پیشنهاد را ببینید.", cta: c.ctaLabel || "مشاهده پیشنهاد", href: c.linkUrl || "/signup", icon: Megaphone, className: "is-campaign", imageUrl: c.imageUrl })),
    ...defaults,
  ], [campaigns]);
  const safeActive = active % slides.length;
  const go = (index: number) => setActive((index + slides.length) % slides.length);
  useEffect(() => { const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500); return () => window.clearInterval(timer); }, [slides.length]);
  const slide = slides[safeActive];
  const Icon = slide.icon;

  return <section className="landing-showcase" aria-label="پیشنهادها و اطلاعیه‌های پیوو">
    <div className="landing-showcase-label"><span><i /> ویترین پیوو</span><small>قابل مدیریت از پنل سوپرادمین</small></div>
    <div className={`landing-slider ${slide.className}`} style={slide.imageUrl ? { "--campaign-image": `url("${slide.imageUrl.replace(/["\\]/g, "")}")` } as CSSProperties : undefined}>
      <div key={safeActive} className="landing-slide-content landing-slide-enter"><div className="landing-slide-icon"><Icon size={19} /></div><span>{slide.kicker}</span><h2>{slide.title}</h2><p>{slide.text}</p><Link href={slide.href}>{slide.cta}<ArrowLeft size={17} /></Link></div>
      <div className="landing-slider-tech" aria-hidden><i /><i /><i /><span>SMART FLOW</span></div>
      <div className="landing-slider-controls"><button onClick={() => go(safeActive - 1)} aria-label="اسلاید قبلی"><ChevronRight size={18} /></button><div>{slides.map((_, index) => <button key={index} onClick={() => go(index)} className={index === safeActive ? "active" : ""} aria-label={`رفتن به اسلاید ${index + 1}`}><i /></button>)}</div><button onClick={() => go(safeActive + 1)} aria-label="اسلاید بعدی"><ChevronLeft size={18} /></button></div>
      <span className="landing-slide-count">۰{safeActive + 1} / ۰{slides.length}</span>
    </div>
  </section>;
}
