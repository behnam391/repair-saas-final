"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import PhoneVerify from "@/components/PhoneVerify";
import { toLatinDigits, normalizePhone, isValidMobile } from "@/lib/phone";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Check, ChevronLeft, CircuitBoard, Code2, Crown, Eye, EyeOff, LockKeyhole, MonitorSmartphone, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Store, UserRound, UsersRound, Wrench } from "lucide-react";
import Logo from "@/components/Logo";

const BUSINESS_SIZE_OPTIONS = [
  { key: "SOLO", label: "استودیوی شخصی", eyebrow: "فقط خودم", desc: "برای تعمیرکار مستقلی که پذیرش، تعمیر و تحویل را خودش مدیریت می‌کند.", meta: "۱ نفر", icon: UserRound, popular: false },
  { key: "TEAM", label: "تعمیرگاه در حال رشد", eyebrow: "انتخاب محبوب", desc: "برای تیمی که پذیرش و تعمیرات بین چند نفر و چند تخصص تقسیم می‌شود.", meta: "۲ تا ۱۰ نفر", icon: UsersRound, popular: true },
  { key: "ENTERPRISE", label: "مرکز خدمات حرفه‌ای", eyebrow: "ساختار پیشرفته", desc: "برای مجموعه‌های بزرگ با چند بخش، نقش‌های متعدد یا شعبه‌های مختلف.", meta: "+۱۰ نفر", icon: Building2, popular: false },
] as const;

const SPECIALTY_OPTIONS = [
  { key: "HARDWARE", label: "سخت‌افزار", desc: "قطعات، نمایشگر و باتری", icon: Wrench },
  { key: "SOFTWARE", label: "نرم‌افزار", desc: "فلش، بازیابی و تنظیمات", icon: Code2 },
  { key: "BOARD", label: "برد تخصصی", desc: "برد، هارد و میکروسولدری", icon: CircuitBoard },
];

const ACTIVITY_OPTIONS = [
  { key: "REPAIR", label: "خدمات تعمیرات", desc: "پذیرش دستگاه، گردش تعمیر و تحویل", icon: Wrench },
  { key: "DEALER", label: "خرید و فروش", desc: "مدیریت معاملات و موجودی دستگاه", icon: ShoppingBag },
  { key: "BOTH", label: "مرکز کامل موبایل", desc: "تعمیرات و خریدوفروش در کنار هم", icon: Store },
];

// Step wizard: 1=کسب‌وکار، 2=مغازه، 3=مدیر، 4=موبایل و رمز — same visual
// pattern as the device-intake wizard, so signup doesn't read as one long,
// cluttered form on mobile.
const STEPS = ["کسب‌وکار", "مغازه", "مدیر", "ورود"];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: "", address: "", landlinePhone: "", businessSize: "SOLO" as string, specialties: [] as string[], shopType: "REPAIR" as string,
    ownerName: "", nationalId: "", birthDate: "", phone: "", password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [businessConfirmed, setBusinessConfirmed] = useState(false);

  function toggleSpecialty(key: string) {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(key) ? f.specialties.filter((s) => s !== key) : [...f.specialties, key],
    }));
  }

  function nextStep() {
    setError("");
    if (step === 2 && !form.shopName.trim()) {
      setError("نام مغازه را وارد کنید");
      return;
    }
    if (step === 3 && !form.ownerName.trim()) {
      setError("نام مدیر را وارد کنید");
      return;
    }
    setStep(step + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // The phone is the login key. Sign up with ۰۹… and the account is
    // unreachable at the login page forever. See lib/phone.ts.
    if (!isValidMobile(form.phone)) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد");
      return;
    }
    const phone = normalizePhone(form.phone);
    if (!phoneVerified) { setError("ابتدا شماره موبایل را با کد تأیید کنید"); return; }
    setLoading(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, phone }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "ثبت‌نام ناموفق بود");
      setLoading(false);
      return;
    }
    const signInRes = await signIn("shop-credentials", {
      phone, password: form.password, redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) { setError("ثبت‌نام شد ولی ورود خودکار ناموفق بود، لطفاً وارد شوید"); return; }
    router.push("/tickets");
  }

  const selectedModel = BUSINESS_SIZE_OPTIONS.find((option) => option.key === form.businessSize)!;

  if (!businessConfirmed) {
    return (
      <main className="signup-scene">
        <div className="signup-ambient" aria-hidden><i /><i /><i /></div>
        <Link href="/" className="signup-home"><ArrowRight size={15} /> بازگشت به سایت</Link>
        <div className="relative z-10 mx-auto w-[min(92vw,760px)] rounded-3xl border border-white/10 bg-surface/95 p-5 shadow-2xl sm:p-8">
          <div className="mb-6 text-center">
            <Logo size={35} textClassName="text-2xl" />
            <h1 className="display-heading mt-5 text-2xl">چه نوع حسابی می‌خواهید؟</h1>
            <p className="mt-2 text-sm text-muted">حساب مشتری و حساب مدیریت مغازه کاملاً از هم جدا هستند.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/customer/signup" className="group rounded-2xl border border-teal/40 bg-teal/10 p-5 transition hover:border-teal hover:bg-teal/15">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-[#0B1512]"><UserRound size={24} /></span>
              <strong className="block text-lg">من مشتری هستم</strong>
              <p className="mt-2 text-xs leading-6 text-muted">برای پیگیری تعمیر گوشی، دیدن مغازه‌ها و دریافت پیام‌ها حساب مشتری بسازید.</p>
              <b className="mt-4 flex items-center gap-1 text-xs text-teal">ثبت‌نام مشتری <ArrowLeft size={14} /></b>
            </Link>
            <button type="button" onClick={() => setBusinessConfirmed(true)} className="group rounded-2xl border border-copper/40 bg-copper/10 p-5 text-right transition hover:border-copper hover:bg-copper/15">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-copper text-[#1A1410]"><Store size={24} /></span>
              <strong className="block text-lg">صاحب یا مدیر مغازه هستم</strong>
              <p className="mt-2 text-xs leading-6 text-muted">برای ساخت فضای کاری، پذیرش دستگاه و مدیریت تعمیرگاه ادامه دهید.</p>
              <b className="mt-4 flex items-center gap-1 text-xs text-copper">ساخت حساب کسب‌وکار <ArrowLeft size={14} /></b>
            </button>
          </div>
          <p className="mt-5 text-center text-xs text-muted">قبلاً حساب دارید؟ <Link href="/login" className="font-bold text-copper">انتخاب نوع ورود</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="signup-scene">
      <div className="signup-ambient" aria-hidden><i /><i /><i /></div>
      <Link href="/" className="signup-home"><ArrowRight size={15} /> بازگشت به سایت</Link>

      <div className="signup-shell">
        <aside className="signup-rail">
          <Logo size={31} textClassName="text-xl" />
          <div className="signup-rail-copy">
            <span>راه‌اندازی فضای کاری</span>
            <h2>چند قدم تا یک<br />تعمیرگاه هوشمند.</h2>
            <p>پیوو براساس مدل کاری شما، فضای مناسب و ابزارهای موردنیازتان را آماده می‌کند.</p>
          </div>
          <div className="signup-steps">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const state = number < step ? "done" : number === step ? "active" : "next";
              return <button type="button" key={label} disabled={number > step} onClick={() => number < step && setStep(number)} className={`is-${state}`}><i>{state === "done" ? <Check size={14} /> : number}</i><span><strong>{label}</strong><small>{["مدل و نوع فعالیت", "مشخصات فضای کاری", "اطلاعات مدیر", "امنیت و تأیید"][index]}</small></span></button>;
            })}
          </div>
          <div className="signup-rail-security"><ShieldCheck size={15} /><span><strong>اطلاعات شما امن است</strong><small>رمزگذاری و محافظت‌شده</small></span></div>
        </aside>

        <form onSubmit={step === STEPS.length ? submit : (e) => e.preventDefault()} className="signup-form-panel">
          <div className="signup-mobile-progress"><span>مرحله {step} از {STEPS.length}</span><i><b style={{ width: `${step * 25}%` }} /></i></div>
          <AnimatePresence mode="wait">
            <motion.div key={step} className="signup-step-content" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: .28 }}>
              {step === 1 && <>
                <div className="signup-heading"><span><Sparkles size={14} /> شخصی‌سازی فضای شما</span><h1>کدام مدل به کار شما نزدیک‌تر است؟</h1><p>این انتخاب فقط چیدمان اولیه را مشخص می‌کند و هر زمان قابل تغییر است.</p></div>
                <div className="signup-model-grid">
                  {BUSINESS_SIZE_OPTIONS.map((option) => { const Icon = option.icon; const active = form.businessSize === option.key; return <button key={option.key} type="button" onClick={() => setForm({ ...form, businessSize: option.key })} className={active ? "active" : ""}><div className="signup-model-top"><i><Icon size={20} /></i>{active && <span><Check size={13} /></span>}</div><small>{option.eyebrow}</small><strong>{option.label}</strong><p>{option.desc}</p><em>{option.meta}</em>{option.popular && <b>پیشنهاد پیوو</b>}</button>; })}
                </div>

                <div className="signup-subsection"><div><strong>حوزه فعالیت شما</strong><small>کدام بخش‌ها را مدیریت می‌کنید؟</small></div></div>
                <div className="signup-activity-grid">
                  {ACTIVITY_OPTIONS.map((option) => { const Icon = option.icon; const active = form.shopType === option.key; return <button key={option.key} type="button" onClick={() => setForm({ ...form, shopType: option.key })} className={active ? "active" : ""}><i><Icon size={18} /></i><span><strong>{option.label}</strong><small>{option.desc}</small></span>{active && <Check size={15} />}</button>; })}
                </div>

                {form.shopType !== "DEALER" && <motion.div className="signup-specialties" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}><div className="signup-subsection"><div><strong>تخصص‌های فعال</strong><small>یک یا چند مورد را انتخاب کنید</small></div></div><div className="signup-specialty-grid">{SPECIALTY_OPTIONS.map((option) => { const Icon = option.icon; const active = form.specialties.includes(option.key); return <button key={option.key} type="button" onClick={() => toggleSpecialty(option.key)} className={active ? "active" : ""}><Icon size={17} /><span><strong>{option.label}</strong><small>{option.desc}</small></span>{active && <Check size={14} />}</button>; })}</div></motion.div>}
              </>}

              {step === 2 && <><div className="signup-heading"><span><Store size={14} /> هویت کسب‌وکار</span><h1>فضای کاری‌تان را معرفی کنید</h1><p>این اطلاعات در پنل و ارتباط با مشتریان نمایش داده می‌شود.</p></div><div className="signup-fields"><label><span>نام فروشگاه یا تعمیرگاه</span><div><Store size={18} /><input autoFocus value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} placeholder="مثلاً موبایل مرکزی" /></div></label><label><span>آدرس <small>اختیاری</small></span><div><MonitorSmartphone size={18} /><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="شهر، خیابان و پلاک" /></div></label><label><span>تلفن ثابت <small>اختیاری</small></span><div><Smartphone size={18} /><input dir="ltr" value={form.landlinePhone} onChange={(e) => setForm({ ...form, landlinePhone: toLatinDigits(e.target.value) })} placeholder="021xxxxxxxx" /></div></label></div><div className="signup-summary"><Crown size={17} /><span><small>فضای انتخاب‌شده</small><strong>{selectedModel.label} · {ACTIVITY_OPTIONS.find((x) => x.key === form.shopType)?.label}</strong></span></div></>}

              {step === 3 && <><div className="signup-heading"><span><UserRound size={14} /> مدیر فضای کاری</span><h1>حساب مدیر را بسازید</h1><p>این حساب دسترسی مالک و مدیریت کامل فضای کاری را خواهد داشت.</p></div><div className="signup-fields"><label><span>نام و نام خانوادگی مدیر</span><div><UserRound size={18} /><input autoFocus value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="نام کامل شما" /></div></label><div className="signup-field-row"><label><span>کد ملی</span><div><ShieldCheck size={18} /><input dir="ltr" inputMode="numeric" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: toLatinDigits(e.target.value) })} placeholder="۱۰ رقم" /></div></label><label><span>تاریخ تولد</span><JalaliDatePicker className="signup-date-input" value={form.birthDate} onChange={(value) => setForm({ ...form, birthDate: value })} /></label></div></div></>}

              {step === 4 && <><div className="signup-heading"><span><LockKeyhole size={14} /> ورود امن</span><h1>آخرین قدم؛ تأیید هویت</h1><p>شماره موبایل شما، شناسه ورود به فضای مدیریت خواهد بود.</p></div><div className="signup-fields"><label><span>شماره موبایل مدیر</span><div><Smartphone size={18} /><input autoFocus inputMode="tel" dir="ltr" maxLength={11} placeholder="0912 345 6789" value={form.phone} onChange={(e) => setForm({ ...form, phone: toLatinDigits(e.target.value) })} /></div></label><div className="signup-verification"><PhoneVerify phone={form.phone} email={undefined} onChange={setPhoneVerified} /></div><label><span>رمز عبور</span><div><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="حداقل ۸ کاراکتر" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label></div></>}
            </motion.div>
          </AnimatePresence>

          {error && <motion.p className="signup-error" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p>}
          <div className="signup-navigation">
            {step > 1 && <button type="button" className="signup-prev" onClick={() => { setError(""); setStep(step - 1); }}><ArrowRight size={17} /> مرحله قبل</button>}
            {step < STEPS.length ? <button type="button" className="signup-next" onClick={nextStep}>ادامه مسیر <ArrowLeft size={18} /></button> : <button type="submit" disabled={loading || !phoneVerified} className="signup-next">{loading ? "در حال ساخت فضای شما..." : !phoneVerified ? "ابتدا شماره را تأیید کنید" : "ساخت فضای کاری"}<ChevronLeft size={18} /></button>}
          </div>
          <p className="signup-login">قبلاً حساب ساخته‌اید؟ <Link href="/login">وارد شوید</Link></p>
        </form>
      </div>
    </main>
  );
}
