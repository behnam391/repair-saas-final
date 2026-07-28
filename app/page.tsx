import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import EnamadBadge from "@/components/EnamadBadge";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🔧", title: "گردش‌کار تعمیر چند‌تخصصی", desc: "پذیرش دستگاه، ارجاع بین سخت‌افزار/نرم‌افزار/برد، و تأیید هزینه و دستمزد تعمیرکار — همه در یک جریان منظم." },
  { icon: "📩", title: "پیامک خودکار به مشتری", desc: "از لحظه‌ی پذیرش تا آماده‌شدن دستگاه، مشتری با پیامک در جریان کار قرار می‌گیرد." },
  { icon: "💬", title: "پنل مشتری و چت", desc: "مشتری سابقه‌ی تعمیرهایش را می‌بیند، مستقیم با مغازه چت می‌کند و امتیاز ثبت می‌کند." },
  { icon: "🧾", title: "فاکتور، انبار و دخل‌وخرج", desc: "صدور فاکتور حرفه‌ای، مدیریت انبار قطعات، و گزارش سود واقعی مغازه." },
  { icon: "🤝", title: "همکاری بین مغازه‌ها", desc: "مشتری را به مغازه‌ی همکار در تخصص دیگر ارجاع بده و بابتش پورسانت بگیر." },
  { icon: "🔳", title: "پذیرش با QR", desc: "مشتری با اسکن کد QR خودش دستگاهش را ثبت می‌کند و مغازه فقط تأیید می‌کند." },
];

export default async function Home() {
  // Signed-in visitors go straight to their own space; the landing page is
  // for anonymous visitors (and for Enamad / payment-gateway verification,
  // which crawl the domain root and expect a real business site + the seal).
  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  if (u?.isSuperAdmin) redirect("/superadmin");
  if (u?.isCustomer) redirect("/customer");
  if (u?.shopId) redirect("/tickets");

  return (
    <div className="min-h-screen">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
        <Logo size={30} textClassName="text-xl" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-xs font-bold text-ink px-3 py-2 rounded-lg hover:bg-surface2 transition">ورود</Link>
          <Link href="/signup" className="text-xs font-bold bg-copper text-[#1A1410] px-4 py-2 rounded-lg">ثبت‌نام رایگان</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="text-center px-5 pt-10 pb-14 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-surface border border-surface2 rounded-full px-3.5 py-1.5 text-[11px] text-muted mb-6">
          ⚡ سیستم مدیریت تعمیرگاه موبایل
        </div>
        <h1 className="display-heading text-3xl sm:text-4xl leading-tight mb-4">
          پیوندِ تعمیرکار، فروشنده و مشتری
        </h1>
        <p className="text-sm sm:text-base text-muted leading-8 mb-8 max-w-xl mx-auto">
          پیوو کل کارِ تعمیرگاه موبایل شما را از پذیرش دستگاه تا تحویل و فاکتور مدیریت می‌کند — و مشتری را در هر مرحله در جریان می‌گذارد.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup" className="bg-copper text-[#1A1410] font-bold rounded-xl px-6 py-3 text-sm">ثبت‌نام رایگان مغازه</Link>
          <Link href="/login" className="bg-surface border border-surface2 font-bold rounded-xl px-6 py-3 text-sm">ورود به پنل</Link>
        </div>
        <p className="text-[11px] text-muted mt-4">
          مشتری هستید؟ <Link href="/customer/login" className="text-teal font-semibold">ورود مشتریان</Link> — مغازه‌های اطرافتان را مقایسه کنید و سابقه تعمیرهایتان را ببینید.
        </p>
      </section>

      <div className="brand-underline max-w-5xl mx-auto" />

      {/* ── Features ── */}
      <section className="px-5 py-14 max-w-5xl mx-auto">
        <h2 className="display-heading text-xl text-center mb-2">همه‌چیز در یک نرم‌افزار</h2>
        <p className="text-xs text-muted text-center mb-8">از گردش‌کار تعمیر تا ارتباط با مشتری و حساب‌وکتاب</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface border border-surface2 rounded-2xl p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-bold text-sm mb-1.5">{f.title}</div>
              <div className="text-xs text-muted leading-6">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="px-5 pb-16 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-3xl p-8 text-center">
          <h2 className="display-heading text-xl mb-2">همین امروز رایگان شروع کنید</h2>
          <p className="text-xs text-muted mb-6 max-w-md mx-auto">با پلن رایگان مغازه‌تان را راه بیندازید؛ هر زمان خواستید ارتقا دهید.</p>
          <Link href="/signup" className="inline-block bg-copper text-[#1A1410] font-bold rounded-xl px-8 py-3 text-sm">ثبت‌نام مغازه</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 py-8 border-t border-surface2">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <Logo size={22} textClassName="text-base" />
          <div className="flex gap-4 flex-wrap justify-center text-[11px] text-muted">
            <Link href="/about" className="hover:text-copper">درباره ما</Link>
            <Link href="/terms" className="hover:text-copper">قوانین و مقررات</Link>
            <Link href="/privacy" className="hover:text-copper">حریم خصوصی</Link>
            <Link href="/refund" className="hover:text-copper">بازگشت وجه</Link>
          </div>
          <EnamadBadge />
          <p className="text-[10px] text-muted">© Peyvo — تمام حقوق محفوظ است.</p>
        </div>
      </footer>
    </div>
  );
}
