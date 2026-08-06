"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Cpu, Megaphone, Sparkles } from "lucide-react";

const slides = [
  {
    kicker: "PEYVO INTELLIGENCE",
    title: "هر تعمیر، یک تصمیم هوشمندتر.",
    text: "جریان کار، وضعیت دستگاه‌ها و رفتار تعمیرگاه را در یک نگاه ببینید و قبل از ایجاد گلوگاه اقدام کنید.",
    cta: "شروع تجربه هوشمند",
    href: "/signup",
    icon: Cpu,
    className: "is-cinematic",
  },
  {
    kicker: "کمپین ویژه تعمیرگاه‌ها",
    title: "تبلیغ بعدی شما، همین‌جا می‌درخشد.",
    text: "این اسلاید برای جشنواره‌ها، معرفی امکانات جدید، تخفیف اشتراک یا همکاری با برندها آماده شده است.",
    cta: "مشاهده امکانات",
    href: "#features",
    icon: Megaphone,
    className: "is-campaign",
  },
  {
    kicker: "یک شروع بدون ریسک",
    title: "رایگان شروع کن؛ حرفه‌ای رشد کن.",
    text: "بدون نصب و هزینه اولیه، تعمیرگاهت را بساز و هر زمان آماده بودی امکانات بیشتری فعال کن.",
    cta: "ساخت حساب رایگان",
    href: "/signup",
    icon: Sparkles,
    className: "is-growth",
  },
];

export default function LandingShowcase() {
  const [active, setActive] = useState(0);
  const go = (index: number) => setActive((index + slides.length) % slides.length);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[active];
  const Icon = slide.icon;

  return (
    <section className="landing-showcase" aria-label="پیشنهادها و اطلاعیه‌های پیوو">
      <div className="landing-showcase-label"><span><i /> ویترین پیوو</span><small>فضای آماده برای تبلیغات و اطلاعیه‌های آینده</small></div>
      <div className={`landing-slider ${slide.className}`}>
        <AnimatePresence mode="wait">
          <motion.div key={active} className="landing-slide-content" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .5, ease: "easeOut" }}>
            <div className="landing-slide-icon"><Icon size={19} /></div>
            <span>{slide.kicker}</span>
            <h2>{slide.title}</h2>
            <p>{slide.text}</p>
            <Link href={slide.href}>{slide.cta}<ArrowLeft size={17} /></Link>
          </motion.div>
        </AnimatePresence>
        <div className="landing-slider-tech" aria-hidden><i /><i /><i /><span>SMART FLOW</span></div>
        <div className="landing-slider-controls">
          <button onClick={() => go(active - 1)} aria-label="اسلاید قبلی"><ChevronRight size={18} /></button>
          <div>{slides.map((_, index) => <button key={index} onClick={() => go(index)} className={index === active ? "active" : ""} aria-label={`رفتن به اسلاید ${index + 1}`}><i /></button>)}</div>
          <button onClick={() => go(active + 1)} aria-label="اسلاید بعدی"><ChevronLeft size={18} /></button>
        </div>
        <span className="landing-slide-count">۰{active + 1} / ۰{slides.length}</span>
      </div>
    </section>
  );
}
