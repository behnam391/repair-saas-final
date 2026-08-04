import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import EnamadBadge from "@/components/EnamadBadge";

export const dynamic = "force-dynamic";

const BRAND_GRAD = "linear-gradient(120deg, #35A9FF 0%, #6FD13F 100%)";

const FEATURES = [
  { icon: "🔧", color: "#35A9FF", title: "گردش‌کار تعمیر چند‌تخصصی", desc: "پذیرش دستگاه، ارجاع بین سخت‌افزار/نرم‌افزار/برد، و تأیید هزینه و دستمزد تعمیرکار — همه در یک جریان منظم.", wide: true },
  { icon: "📩", color: "#6FD13F", title: "پیامک خودکار به مشتری", desc: "از لحظه‌ی پذیرش تا آماده‌شدن دستگاه، مشتری با پیامک در جریان است." },
  { icon: "💬", color: "#35A9FF", title: "پنل مشتری و چت زنده", desc: "مشتری سابقه‌ی تعمیرهایش را می‌بیند، با مغازه چت می‌کند و امتیاز می‌دهد." },
  { icon: "🧾", color: "#FFC24B", title: "فاکتور، انبار و دخل‌وخرج", desc: "فاکتور حرفه‌ای، مدیریت انبار قطعات و گزارش سود واقعی مغازه." },
  { icon: "🤝", color: "#6FD13F", title: "همکاری بین مغازه‌ها", desc: "مشتری را به مغازه‌ی همکار ارجاع بده و پورسانت بگیر.", wide: true },
  { icon: "🔳", color: "#35A9FF", title: "پذیرش با کد QR", desc: "مشتری خودش دستگاهش را با اسکن QR ثبت می‌کند." },
];

const STEPS = [
  { n: "۱", t: "ثبت‌نام رایگان", d: "در چند ثانیه مغازه‌ات را بساز — بدون هزینه‌ی اولیه." },
  { n: "۲", t: "پذیرش و تعمیر", d: "دستگاه‌ها را ثبت کن، بین تعمیرکارها ارجاع بده و مشتری را با پیامک در جریان بگذار." },
  { n: "۳", t: "تحویل و رشد", d: "فاکتور بده، سود واقعی‌ات را ببین و با مغازه‌های دیگر همکاری کن." },
];

export default async function Home() {
  // Signed-in visitors go straight to their space; the landing is for
  // anonymous visitors (and for Enamad / gateway verification, which crawl
  // the domain root and expect a real business site + the seal).
  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  if (u?.isSuperAdmin) redirect("/superadmin");
  if (u?.isCustomer) redirect("/customer");
  if (u?.shopId) redirect("/tickets");

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Ambient brand glows ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(53,169,255,0.30), transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-[30%] -left-40 w-[560px] h-[560px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(111,209,63,0.22), transparent 70%)", filter: "blur(70px)", animationDelay: "1.5s" }} />
      </div>

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 glass-header">
        <div className="flex items-center justify-between px-5 py-3.5 max-w-6xl mx-auto">
          <Logo size={30} textClassName="text-xl" />
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-surface2 transition">ورود</Link>
            <Link href="/signup" className="text-xs font-extrabold text-white px-4 py-2 rounded-xl shadow-lg"
              style={{ background: BRAND_GRAD }}>ثبت‌نام رایگان</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="text-center px-5 pt-16 pb-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-surface border border-surface2 rounded-full px-4 py-1.5 text-[11px] font-semibold text-muted mb-7">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6FD13F" }} />
          سیستم هوشمند مدیریت تعمیرگاه موبایل
        </div>

        <h1 className="font-black leading-[1.25] tracking-tight mb-5" style={{ fontSize: "clamp(2.1rem, 7vw, 3.4rem)" }}>
          <span className="text-ink">پیوندِ </span>
          <span style={{ background: BRAND_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            تعمیرکار، فروشنده
          </span>
          <span className="text-ink"> و مشتری</span>
        </h1>

        <p className="text-muted leading-9 mb-9 max-w-xl mx-auto font-light" style={{ fontSize: "clamp(0.95rem, 2.6vw, 1.15rem)" }}>
          پیوو کل کارِ تعمیرگاه موبایل شما را از پذیرش دستگاه تا تحویل و فاکتور مدیریت می‌کند — و مشتری را در هر مرحله در جریان می‌گذارد.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup" className="text-white font-extrabold rounded-2xl px-7 py-3.5 text-sm shadow-xl hover:brightness-110 transition"
            style={{ background: BRAND_GRAD }}>
            ثبت‌نام رایگان مغازه ←
          </Link>
          <Link href="/login" className="bg-surface border border-surface2 font-bold rounded-2xl px-7 py-3.5 text-sm hover:bg-surface2 transition">
            ورود به پنل
          </Link>
        </div>
        <p className="text-[11px] text-muted mt-5">
          مشتری هستید؟ <Link href="/customer/login" className="text-teal font-bold">ورود مشتریان</Link> — مغازه‌های اطرافتان را مقایسه کنید.
        </p>
      </section>

      {/* ── Product preview mock ── */}
      <section className="px-5 pb-16 max-w-3xl mx-auto">
        <div className="relative rounded-3xl border border-surface2 p-3 sm:p-4"
          style={{ background: "var(--glass-sheet)", backdropFilter: "blur(24px)", boxShadow: "0 30px 80px rgba(2,6,20,0.5)" }}>
          {/* window chrome */}
          <div className="flex items-center gap-1.5 px-2 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-teal/70" />
            <span className="ms-auto text-[10px] text-muted mono">peyvo.ir</span>
          </div>
          {/* mini board */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "سخت‌افزار", tint: "#35A9FF", items: ["iPhone 13 — تعویض ال‌سی‌دی", "A54 — شارژ نمی‌شود"] },
              { label: "نرم‌افزار", tint: "#6FD13F", items: ["Note 12 — فلش", "13 Pro — رمز"] },
              { label: "آماده تحویل", tint: "#FFC24B", items: ["A32 — آماده ✓"] },
            ].map((col) => (
              <div key={col.label} className="bg-surface border border-surface2 rounded-2xl p-2">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.tint }} />
                  <span className="text-[10px] sm:text-[11px] font-bold">{col.label}</span>
                </div>
                <div className="space-y-1.5">
                  {col.items.map((it, i) => (
                    <div key={i} className="bg-surface2 rounded-xl px-2 py-2 text-[9px] sm:text-[10px] leading-4 text-ink/90">{it}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (bento) ── */}
      <section className="px-5 py-8 max-w-5xl mx-auto">
        <h2 className="font-black text-center mb-2" style={{ fontSize: "clamp(1.4rem, 4vw, 1.9rem)" }}>همه‌چیز در یک نرم‌افزار</h2>
        <p className="text-xs text-muted text-center mb-9">از گردش‌کار تعمیر تا ارتباط با مشتری و حساب‌وکتاب</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div key={f.title}
              className={`group bg-surface border border-surface2 rounded-3xl p-6 transition hover:-translate-y-1 hover:border-[color:var(--color-copper)] ${f.wide ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-4"
                style={{ background: `${f.color}22`, boxShadow: `inset 0 0 0 1px ${f.color}44` }}>
                {f.icon}
              </div>
              <div className="font-extrabold text-[15px] mb-2">{f.title}</div>
              <div className="text-xs text-muted leading-6">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-5 py-12 max-w-4xl mx-auto">
        <h2 className="font-black text-center mb-9" style={{ fontSize: "clamp(1.4rem, 4vw, 1.9rem)" }}>در سه قدم شروع کن</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-lg font-black text-white mb-4 shadow-lg"
                style={{ background: BRAND_GRAD }}>{s.n}</div>
              <div className="font-extrabold text-sm mb-1.5">{s.t}</div>
              <div className="text-xs text-muted leading-6 max-w-[220px] mx-auto">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="px-5 pb-20 pt-6 max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-[2rem] border border-surface2 p-10 text-center">
          <div aria-hidden className="absolute inset-0 -z-10 opacity-60" style={{ background: BRAND_GRAD, filter: "blur(40px)", transform: "scale(1.2)" }} />
          <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "var(--color-bg)", opacity: 0.72 }} />
          <h2 className="font-black mb-3" style={{ fontSize: "clamp(1.5rem, 4.5vw, 2.1rem)" }}>همین امروز رایگان شروع کنید</h2>
          <p className="text-sm text-muted mb-7 max-w-md mx-auto">با پلن رایگان مغازه‌تان را راه بیندازید؛ هر زمان خواستید ارتقا دهید.</p>
          <Link href="/signup" className="inline-block text-white font-extrabold rounded-2xl px-9 py-4 text-sm shadow-xl hover:brightness-110 transition"
            style={{ background: BRAND_GRAD }}>
            ثبت‌نام مغازه ←
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 py-10 border-t border-surface2">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-5">
          <Logo size={24} textClassName="text-base" />
          <div className="flex gap-5 flex-wrap justify-center text-[11px] text-muted">
            <Link href="/download" className="hover:text-copper transition">📱 دانلود اپلیکیشن</Link>
            <Link href="/about" className="hover:text-copper transition">درباره ما</Link>
            <Link href="/terms" className="hover:text-copper transition">قوانین و مقررات</Link>
            <Link href="/privacy" className="hover:text-copper transition">حریم خصوصی</Link>
            <Link href="/refund" className="hover:text-copper transition">بازگشت وجه</Link>
          </div>
          <EnamadBadge />
          <p className="text-[10px] text-muted">© Peyvo — تمام حقوق محفوظ است.</p>
        </div>
      </footer>
    </div>
  );
}
