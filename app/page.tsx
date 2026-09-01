import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, BarChart3, Check, CircleDollarSign, Clock3, Download,
  Headphones, MessageSquareText, PackageCheck, QrCode, ShieldCheck,
  Smartphone, Sparkles, UsersRound, Wrench,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { LATEST_ANDROID_RELEASE } from "@/lib/app-release";
import Logo from "@/components/Logo";
import EnamadBadge from "@/components/EnamadBadge";
import EnamadServerBadge from "@/components/EnamadServerBadge";
import ZarinpalTrustBadge from "@/components/ZarinpalTrustBadge";
import ThemeToggle from "@/components/ThemeToggle";
import PwaInstallButton from "@/components/PwaInstallButton";

export const dynamic = "force-dynamic";

const features = [
  { icon: Wrench, index: "01", title: "گردش‌کار تعمیرات", text: "از پذیرش و عیب‌یابی تا تخصیص، ثبت قطعه و تحویل؛ یک مسیر روشن و بدون دوباره‌کاری.", tone: "blue", wide: true },
  { icon: MessageSquareText, index: "02", title: "ارتباط هوشمند", text: "اطلاع‌رسانی وضعیت و پیگیری مشتری بدون تماس‌های تکراری.", tone: "green" },
  { icon: BarChart3, index: "03", title: "دید مالی واقعی", text: "درآمد، هزینه، دستمزد و سود هر تعمیر در یک نگاه.", tone: "violet" },
  { icon: PackageCheck, index: "04", title: "انبار دقیق", text: "کنترل موجودی، مصرف قطعه و هشدار کمبود پیش از توقف کار.", tone: "amber" },
  { icon: QrCode, index: "05", title: "پذیرش با QR", text: "ورود سریع اطلاعات دستگاه و تجربه حرفه‌ای از همان لحظه اول.", tone: "cyan" },
  { icon: UsersRound, index: "06", title: "همکاری بین تعمیرگاه‌ها", text: "ارجاع تخصصی، ثبت مسیر ارسال و تسویه شفاف با همکاران مورد اعتماد.", tone: "green", wide: true },
];

const workflow = [
  { n: "۰۱", title: "راه‌اندازی", text: "تعمیرگاه، خدمات و تیم را تعریف کنید." },
  { n: "۰۲", title: "اجرای روزانه", text: "پذیرش، تعمیر و ارتباط با مشتری را یکپارچه کنید." },
  { n: "۰۳", title: "رشد آگاهانه", text: "با گزارش‌های روشن، تصمیم دقیق‌تری بگیرید." },
];

type AppLinks = { apk: string; bazaar: string; myket: string };

async function getAppLinks(): Promise<AppLinks> {
  const fallback = { apk: LATEST_ANDROID_RELEASE.directApkUrl, bazaar: "", myket: "" };
  try {
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } }) as any;
    return {
      apk: settings?.androidApkUrl || fallback.apk,
      bazaar: /^https:\/\/(?:www\.)?cafebazaar\.ir\//i.test(settings?.bazaarUrl || "") ? settings.bazaarUrl : "",
      myket: /^https:\/\/(?:www\.)?myket\.ir\//i.test(settings?.myketUrl || "") ? settings.myketUrl : "",
    };
  } catch {
    return fallback;
  }
}

function StoreChoice({ href, store, label, logo }: { href: string; store: string; label: string; logo: string }) {
  const body = <><i><img src={logo} alt="" /></i><span><small>{href ? label : "در حال بررسی و انتشار"}</small><strong>{store}</strong></span></>;
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="home-store-choice">{body}</a>
    : <div className="home-store-choice is-pending" aria-label={`${store}؛ در حال بررسی`}>{body}</div>;
}

function StoreTrustBadge({
  href, store, logo, publishedLabel,
}: {
  href: string;
  store: string;
  logo: string;
  publishedLabel: string;
}) {
  const logoNode = (
    <span className="home-store-seal-logo">
      <img src={logo} alt={`لوگوی رسمی ${store}`} />
    </span>
  );

  return (
    <article className={`home-store-seal ${href ? "is-published" : "is-pending"}`}>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`مشاهده صفحه رسمی پیوو در ${store}`}>{logoNode}</a>
        : logoNode}
      <strong>{href ? publishedLabel : store}</strong>
      <small>{href ? "مشاهده صفحه رسمی پیوو" : "در حال بررسی و انتشار"}</small>
    </article>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (user?.isSuperAdmin) redirect("/superadmin");
  if (user?.isCustomer) redirect("/customer");
  if (user?.shopId) redirect("/tickets");
  // Store APKs are application clients, not download landing pages.  A
  // native WebView is sent to the role-specific login instead of exposing
  // direct APK/store links from the public website.
  if (/\bPeyvoNativeApp\b/i.test(headers().get("user-agent") || "")) redirect("/login");

  const appLinks = await getAppLinks();

  return (
    <main className="landing-root home-v2">
      <div className="home-atmosphere" aria-hidden><i /><i /><i /></div>

      <header className="home-header">
        <div className="home-nav">
          <Link href="/" aria-label="صفحه اصلی پیوو" className="home-brand"><Logo size={32} textClassName="text-xl" /></Link>
          <nav className="home-nav-links" aria-label="ناوبری اصلی">
            <a href="#product">محصول</a>
            <a href="#features">امکانات</a>
            <a href="#workflow">نحوه کار</a>
            <a href="#trust">اعتماد و مجوزها</a>
          </nav>
          <div className="home-nav-actions">
            <ThemeToggle className="home-theme-toggle" />
            <Link href="/login" className="home-nav-login">ورود به پنل</Link>
            <Link href="/download" className="home-nav-download"><Download size={15} /> دانلود برنامه</Link>
          </div>
        </div>
      </header>

      <section className="home-hero" id="product">
        <div className="home-hero-copy">
          <div className="home-eyebrow"><span><i /> سامانه فعال و آنلاین</span><b>ساخته‌شده برای تعمیرگاه‌های ایران</b></div>
          <h1><em>پیوو؛</em> مدیریت هوشمند تعمیرگاه</h1>
          <p>از پذیرش دستگاه تا تعمیر، اطلاع‌رسانی، تحویل و تسویه؛ همه‌چیز را ساده، یکپارچه و مطمئن مدیریت کنید.</p>
          <div className="home-hero-actions">
            <Link href="/signup" className="home-primary-action">شروع رایگان <ArrowLeft size={18} /></Link>
            <Link href="/customer/login" className="home-secondary-action"><Smartphone size={17} /> ورود مشتریان</Link>
          </div>
          <div className="home-reassurance">
            <span><Check size={13} /> شروع بدون هزینه</span>
            <span><Check size={13} /> راه‌اندازی سریع</span>
            <span><Check size={13} /> پشتیبانی فارسی</span>
          </div>

          <div className="home-install-panel" aria-label="روش‌های دریافت اپلیکیشن پیوو">
            <PwaInstallButton />
            <a href={appLinks.apk || "/download"} className="home-store-choice is-direct">
              <i><img src="/icons/icon-mark.png" alt="" /></i><span><small>نسخه {LATEST_ANDROID_RELEASE.versionName}</small><strong>دانلود مستقیم</strong></span>
            </a>
            <StoreChoice href={appLinks.bazaar} store="کافه‌بازار" label="دریافت از" logo="/images/trust/cafebazaar-official.png" />
            <StoreChoice href={appLinks.myket} store="مایکت" label="دریافت از" logo="/images/trust/myket-official.png" />
          </div>
        </div>

        <div className="home-ai-visual" aria-label="دستیار هوشمند پیوو و نمای گردش کار تعمیرگاه">
          <div className="home-ai-board" aria-hidden="true">
            <div className="home-ai-board-head"><span><i /> وضعیت زنده تعمیرگاه</span><b>امروز</b></div>
            <div className="home-ai-board-flow">
              <span><i /> پذیرش</span><span><i /> در حال تعمیر</span><span><i /> آماده تحویل</span>
            </div>
            <div className="home-ai-board-line"><i /><i /><i /><i /><i /></div>
            <div className="home-ai-board-note"><Sparkles size={15} /><span><b>دستیار هوشمند پیوو</b><small>کارهای مهم امروز را یک‌جا ببینید</small></span></div>
          </div>
          <div className="home-mascot-halo" aria-hidden="true" />
          <Image className="home-ai-mascot" src="/images/peyvo-ai-assistant-v2.png" alt="کاراکتر دستیار هوشمند پیوو" width={520} height={740} priority sizes="(max-width: 760px) 250px, 410px" />
          <span className="home-ai-caption"><Sparkles size={14} /> دستیار هوشمند، همراه کارهای روزانه</span>
        </div>

      </section>

      <section className="home-proof" aria-label="مزیت‌های پیوو">
        <div><strong>نسخه عملیاتی {LATEST_ANDROID_RELEASE.versionName}</strong><small>سامانه آماده استفاده و در حال توسعه مستمر</small></div>
        <span><ShieldCheck /> هویت و پرداخت قابل استعلام</span>
        <span><Smartphone /> دسترسی وب و اندروید</span>
        <span><Clock3 /> چرخه کامل پذیرش تا تحویل</span>
        <span><Headphones /> پشتیبانی فارسی</span>
      </section>

      <section id="features" className="home-section home-capabilities">
        <div className="home-section-head">
          <span><Sparkles size={14} /> همه‌چیز در یک جریان</span>
          <h2>نظم حرفه‌ای، بدون پیچیدگی.</h2>
          <p>هر ابزاری که برای اداره یک تعمیرگاه مدرن لازم دارید؛ دقیقاً جایی که باید باشد.</p>
        </div>
        <div className="home-bento">
          {features.map(({ icon: Icon, index, title, text, tone, wide }) => (
            <article key={title} className={`home-feature tone-${tone} ${wide ? "is-wide" : ""}`}>
              <div className="home-feature-top"><i><Icon size={21} /></i><span>{index}</span></div>
              <h3>{title}</h3><p>{text}</p>
              {wide && <div className="home-feature-signal" aria-hidden><i /><i /><i /><i /><span /></div>}
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-intelligence">
        <div className="home-intelligence-copy">
          <span><Sparkles size={14} /> هوشمندی کاربردی، نه نمایشی</span>
          <h2>اطلاعات را ثبت نکنید؛<br /><em>از آن تصمیم بسازید.</em></h2>
          <p>پیوو جریان روزانه تعمیرگاه را به نشانه‌های ساده و قابل اقدام تبدیل می‌کند؛ بدانید چه چیزی عقب افتاده، کدام قطعه رو به اتمام است و امروز کجا باید تمرکز کنید.</p>
          <div><span><Check size={13} /> تشخیص گلوگاه</span><span><Check size={13} /> هشدار موجودی</span><span><Check size={13} /> دید مالی</span></div>
        </div>
      </section>

      <section id="workflow" className="home-section home-workflow">
        <div className="home-section-head compact"><span>شروع ساده</span><h2>سه قدم تا یک تعمیرگاه منظم</h2></div>
        <div className="home-workflow-grid">
          {workflow.map((step, index) => <article key={step.n}><div><span>{step.n}</span>{index < workflow.length - 1 && <i />}</div><h3>{step.title}</h3><p>{step.text}</p></article>)}
        </div>
      </section>

      <section id="trust" className="home-section home-trust">
        <div className="home-trust-copy">
          <span><ShieldCheck size={15} /> هویت، پرداخت و انتشار رسمی</span>
          <h2>اعتمادی که قابل استعلام است.</h2>
          <p>هویت و دامنه پیوو در سامانه رسمی اینماد بررسی شده، پرداخت‌های وب از مسیر امن زرین‌پال انجام می‌شود و نسخه اندروید از کانال‌های معتبر فروشگاهی در دسترس قرار می‌گیرد.</p>
          <div><span><Check size={12} /> دامنه ثبت‌شده</span><span><Check size={12} /> هویت تأییدشده</span><span><Check size={12} /> انتشار رسمی اپلیکیشن</span></div>
        </div>
        <div className="home-seals">
          <article><EnamadServerBadge /><strong>نماد اعتماد الکترونیکی</strong><small>استعلام از سامانه رسمی</small></article>
          <article><ZarinpalTrustBadge /><strong>درگاه پرداخت زرین‌پال</strong><small>پرداخت امن برای همین دامنه</small></article>
          <StoreTrustBadge href={appLinks.bazaar} store="کافه‌بازار" logo="/images/trust/cafebazaar-official.png" publishedLabel="انتشار رسمی کافه‌بازار" />
          <StoreTrustBadge href={appLinks.myket} store="مایکت" logo="/images/trust/myket-official.png" publishedLabel="انتشار رسمی مایکت" />
        </div>
      </section>

      <section className="home-final">
        <div className="home-final-glow" aria-hidden />
        <span>آماده یک شروع حرفه‌ای هستید؟</span>
        <h2>سامانه مدیریت تعمیرگاه شما،<br />همین حالا آماده است.</h2>
        <p>رایگان شروع کنید و پیوو را با جریان واقعی تعمیرگاه خودتان بسنجید.</p>
        <div><Link href="/signup" className="home-primary-action">ساخت حساب رایگان <ArrowLeft size={18} /></Link><Link href="/download" className="home-final-download"><Download size={16} /> دانلود برنامه</Link></div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-main">
          <div className="home-footer-brand"><Logo size={34} /><p>زیرساخت یکپارچه مدیریت تعمیرگاه؛ دقیق، سریع و قابل اعتماد.</p><div><i /> سامانه فعال</div></div>
          <div><strong>محصول</strong><a href="#features">امکانات</a><a href="#workflow">نحوه کار</a><Link href="/download">دانلود برنامه</Link></div>
          <div><strong>دسترسی</strong><Link href="/login">ورود تعمیرگاه</Link><Link href="/customer/login">ورود مشتری</Link><Link href="/signup">ثبت‌نام رایگان</Link></div>
          <div><strong>پشتیبانی و قوانین</strong><Link href="/support">پشتیبانی</Link><Link href="/terms">شرایط استفاده</Link><Link href="/privacy">حریم خصوصی</Link></div>
          <div className="home-footer-seal"><EnamadBadge /><small>هویت کسب‌وکار تأیید شده</small></div>
        </div>
        <div className="home-footer-bottom"><span>© ۱۴۰۵ پیوو؛ تمامی حقوق محفوظ است.</span><span>ساخته‌شده برای تعمیرکاران ایران</span></div>
      </footer>
    </main>
  );
}
