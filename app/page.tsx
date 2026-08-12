import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, Check, ChevronLeft, CircleDollarSign, Clock3,
  Headphones, MessageSquareText, PackageCheck, QrCode, ShieldCheck,
  Smartphone, Sparkles, UsersRound, Wrench,
} from "lucide-react";
import Logo from "@/components/Logo";
import EnamadBadge from "@/components/EnamadBadge";
import EnamadServerBadge from "@/components/EnamadServerBadge";
import LandingShowcase from "@/components/LandingShowcase";

export const dynamic = "force-dynamic";

const features = [
  { icon: Wrench, title: "مدیریت کامل تعمیرات", text: "از پذیرش و عیب‌یابی تا تخصیص تعمیرکار، ثبت قطعه و تحویل نهایی؛ همه در یک مسیر شفاف.", tone: "blue", large: true },
  { icon: MessageSquareText, title: "ارتباط خودکار با مشتری", text: "پیامک وضعیت، پنل پیگیری و گفت‌وگوی مستقیم؛ بدون تماس‌های تکراری.", tone: "green" },
  { icon: BarChart3, title: "سود واقعی، نه حدس", text: "درآمد، هزینه، دستمزد و سود هر تعمیر را لحظه‌ای ببینید.", tone: "violet" },
  { icon: PackageCheck, title: "انبار هوشمند قطعات", text: "موجودی، هشدار کمبود و مصرف قطعات را دقیق کنترل کنید.", tone: "amber" },
  { icon: QrCode, title: "پذیرش سریع با QR", text: "مشتری اطلاعات دستگاه را ثبت می‌کند و صف پذیرش سریع‌تر پیش می‌رود.", tone: "cyan" },
  { icon: UsersRound, title: "شبکه همکاری تعمیرگاه‌ها", text: "ارجاع تخصصی، همکاری امن و ساختن یک شبکه حرفه‌ای از همکاران.", tone: "green", large: true },
];

const steps = [
  { n: "۰۱", title: "تعمیرگاهت را بساز", text: "رایگان ثبت‌نام کن و اطلاعات، خدمات و اعضای تیمت را وارد کن." },
  { n: "۰۲", title: "پذیرش را شروع کن", text: "دستگاه را ثبت، تعمیرکار را مشخص و مشتری را خودکار مطلع کن." },
  { n: "۰۳", title: "دقیق‌تر رشد کن", text: "با گزارش سود، رضایت مشتری و عملکرد تیم تصمیم‌های بهتر بگیر." },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (user?.isSuperAdmin) redirect("/superadmin");
  if (user?.isCustomer) redirect("/customer");
  if (user?.shopId) redirect("/tickets");

  return (
    <main className="landing-root">
      <div className="landing-noise" aria-hidden />
      <header className="landing-header">
        <div className="landing-nav">
          <Logo size={31} textClassName="text-xl" />
          <nav className="landing-nav-links" aria-label="ناوبری اصلی">
            <a href="#features">امکانات</a>
            <a href="#workflow">نحوه کار</a>
            <Link href="/about">درباره پیوو</Link>
          </nav>
          <div className="landing-nav-actions">
            <Link href="/login" className="landing-login-link">ورود</Link>
            <Link href="/signup" className="landing-nav-cta">شروع رایگان <ChevronLeft size={15} /></Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-glow landing-glow-blue" aria-hidden />
        <div className="landing-hero-glow landing-glow-green" aria-hidden />
        <div className="landing-hero-copy">
          <div className="landing-pill"><Sparkles size={14} /> نسل جدید مدیریت تعمیرگاه موبایل <span>جدید</span></div>
          <h1>تعمیرگاهت را<br /><em>حرفه‌ای‌تر</em> مدیریت کن.</h1>
          <p>پیوو پذیرش، تعمیرات، مشتریان، انبار و حساب‌وکتاب را در یک فضای سریع و یکپارچه کنار هم می‌آورد؛ تا شما روی رشد تمرکز کنید.</p>
          <div className="landing-hero-actions">
            <Link href="/signup" className="landing-primary-btn">ساخت حساب رایگان <ArrowLeft size={18} /></Link>
            <Link href="/customer/login" className="landing-secondary-btn"><Smartphone size={17} /> ورود مشتریان</Link>
          </div>
          <div className="landing-trust-row">
            <span><Check size={14} /> بدون هزینه شروع</span>
            <span><Check size={14} /> بدون نیاز به نصب</span>
            <span><Check size={14} /> راه‌اندازی سریع</span>
          </div>
        </div>

        <div className="landing-product-wrap" aria-label="پیش‌نمایش داشبورد پیوو">
          <div className="landing-float-chip landing-chip-online"><i /> سامانه آنلاین</div>
          <div className="landing-float-chip landing-chip-rating"><span>★</span><b>۴.۹</b><small>رضایت مشتری</small></div>
          <div className="landing-dashboard">
            <div className="landing-window-bar"><div><i /><i /><i /></div><span>app.peyvo.ir</span><ShieldCheck size={13} /></div>
            <div className="landing-dashboard-body">
              <aside className="landing-mini-side">
                <div className="landing-mini-logo"><Logo size={22} /></div>
                {["خانه", "تعمیرات", "مشتریان", "انبار", "گزارش‌ها"].map((item, index) => <div key={item} className={index === 1 ? "active" : ""}><i />{item}</div>)}
              </aside>
              <div className="landing-mini-main">
                <div className="landing-mini-head"><div><small>داشبورد تعمیرگاه</small><strong>سلام، روز خوبی داشته باشید 👋</strong></div><span><span /> آنلاین</span></div>
                <div className="landing-stat-grid">
                  <article><Wrench size={16} /><small>در حال تعمیر</small><strong>۱۲</strong><em>+۳ امروز</em></article>
                  <article><PackageCheck size={16} /><small>آماده تحویل</small><strong>۸</strong><em>+۲ امروز</em></article>
                  <article><CircleDollarSign size={16} /><small>فروش امروز</small><strong>۶.۴م</strong><em>۱۸٪ رشد</em></article>
                </div>
                <div className="landing-board-head"><strong>جریان تعمیرات</strong><span>مشاهده همه</span></div>
                <div className="landing-kanban">
                  <div><header><i className="blue" />پذیرش شده <b>۳</b></header><article><strong>iPhone 13</strong><small>تعویض ال‌سی‌دی</small><span>امیر رضایی</span></article><article><strong>Galaxy A54</strong><small>مشکل شارژ</small><span>سارا احمدی</span></article></div>
                  <div><header><i className="violet" />در حال تعمیر <b>۲</b></header><article><strong>iPhone 14 Pro</strong><small>تعمیر برد</small><span>محمد کریمی</span></article></div>
                  <div><header><i className="green" />آماده تحویل <b>۴</b></header><article><strong>Redmi Note 12</strong><small>تعویض باتری</small><span>علی مرادی</span></article></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof">
        <div><strong>یک پنل، تمام تعمیرگاه</strong><span>از لحظه پذیرش تا تحویل دستگاه</span></div>
        <div className="landing-proof-items">
          <span><Clock3 /> پیگیری لحظه‌ای</span><span><ShieldCheck /> اطلاعات امن</span><span><Headphones /> پشتیبانی واقعی</span><span><CircleDollarSign /> حسابداری دقیق</span>
        </div>
      </section>

      <LandingShowcase />

      <section className="landing-intelligence">
        <div className="landing-intelligence-copy">
          <span><Sparkles size={14} /> هوشمندی در خدمت تعمیرگاه</span>
          <h2>پیوو فقط ثبت نمی‌کند؛<br /><em>به شما دید می‌دهد.</em></h2>
          <p>اطلاعات پراکنده را به نشانه‌های قابل‌فهم تبدیل کنید؛ ببینید کدام مرحله کند شده، چه قطعه‌ای رو به اتمام است و امروز باید روی چه چیزی تمرکز کنید.</p>
          <div className="landing-intelligence-tags"><span>تشخیص گلوگاه</span><span>هشدار موجودی</span><span>دید مالی</span></div>
        </div>
        <div className="landing-ai-console">
          <div className="landing-ai-top"><span><i /> مرکز هوشمندی پیوو</span><b>LIVE</b></div>
          <div className="landing-ai-prompt"><Sparkles size={16} /><div><small>پیشنهاد امروز</small><strong>سه دستگاه بیش از میانگین زمان تعمیر منتظر مانده‌اند.</strong></div></div>
          <div className="landing-ai-metrics"><article><small>فشار کاری</small><strong>۷۲٪</strong><i><b style={{ width: "72%" }} /></i></article><article><small>سلامت جریان</small><strong>عالی</strong><i><b style={{ width: "91%" }} /></i></article></div>
          <div className="landing-ai-action"><span>اولویت پیشنهادی</span><strong>بررسی تعمیرات بخش برد</strong><button>مشاهده جزئیات <ChevronLeft size={14} /></button></div>
        </div>
      </section>

      <section id="features" className="landing-section landing-features">
        <div className="landing-section-head"><span>همه‌چیز یکجا</span><h2>ابزارهایی که تعمیرگاه<br />واقعاً به آن‌ها نیاز دارد</h2><p>پیچیدگی کمتر، کنترل بیشتر و تجربه‌ای حرفه‌ای‌تر برای تیم و مشتری شما.</p></div>
        <div className="landing-bento">
          {features.map(({ icon: Icon, title, text, tone, large }) => (
            <article key={title} className={`landing-feature-card tone-${tone} ${large ? "is-large" : ""}`}>
              <div className="landing-feature-icon"><Icon size={23} /></div><span className="landing-feature-arrow">↖</span>
              <h3>{title}</h3><p>{text}</p>
              {large && <div className="landing-feature-visual"><i /><i /><i /><span /></div>}
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="landing-section landing-workflow">
        <div className="landing-section-head centered"><span>شروع ساده</span><h2>سه قدم تا یک تعمیرگاه منظم</h2><p>نه آموزش پیچیده‌ای لازم است و نه نصب نرم‌افزار سنگین.</p></div>
        <div className="landing-steps">
          {steps.map((step, index) => <article key={step.n}><div className="landing-step-number">{step.n}</div>{index < 2 && <div className="landing-step-line" />}<h3>{step.title}</h3><p>{step.text}</p></article>)}
        </div>
      </section>

      <section className="landing-final-wrap">
        <div className="landing-final-card">
          <div className="landing-final-orb" aria-hidden />
          <span>وقت یک تغییر حرفه‌ای است</span><h2>تعمیرگاه آینده‌ات را<br />همین امروز بساز.</h2><p>رایگان شروع کن، امکانات پیوو را امتحان کن و هر زمان آماده بودی ارتقا بده.</p>
          <Link href="/signup" className="landing-primary-btn">شروع رایگان پیوو <ArrowLeft size={18} /></Link>
        </div>
      </section>

      <section className="landing-trust-seal" aria-labelledby="trust-title">
        <div className="landing-trust-copy">
          <span><ShieldCheck size={15} /> مجوزها و اعتماد</span>
          <h2 id="trust-title">خرید و استفاده با خیال راحت</h2>
          <p>هویت صاحب امتیاز و دامنه پیوو توسط مرکز توسعه تجارت الکترونیکی بررسی شده است. برای مشاهده جزئیات اعتبار، روی نشان اعتماد کلیک کنید.</p>
          <div><i><Check size={13} /> دامنه ثبت‌شده</i><i><Check size={13} /> هویت تأییدشده</i><i><Check size={13} /> ارتباط امن</i></div>
        </div>
        <div className="landing-seal-card">
          <EnamadServerBadge />
          <strong>نماد اعتماد الکترونیکی</strong>
          <small>قابل استعلام از سامانه رسمی اینماد</small>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-top"><div><Logo size={27} /><p>سامانه یکپارچه مدیریت تعمیرگاه‌های موبایل</p></div><div className="landing-footer-links"><Link href="/download">دانلود اپلیکیشن</Link><Link href="/about">درباره ما</Link><Link href="/terms">قوانین</Link><Link href="/privacy">حریم خصوصی</Link><Link href="/refund">بازگشت وجه</Link></div><EnamadBadge /></div>
        <div className="landing-footer-bottom"><span>© ۱۴۰۵ پیوو؛ تمام حقوق محفوظ است.</span><span>ساخته‌شده برای تعمیرکاران حرفه‌ای ایران</span></div>
      </footer>
    </main>
  );
}
