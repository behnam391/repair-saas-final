import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ClipboardCheck, PackageCheck, ReceiptText, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import Logo from "@/components/Logo";
import { SEO_SOLUTIONS, isSeoSolutionSlug, type SeoSolutionSlug } from "@/lib/seo-solutions";
import "../solutions.css";

const BASE_URL = "https://peyvo.ir";
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(SEO_SOLUTIONS).map(slug => ({ slug })); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  if (!isSeoSolutionSlug(params.slug)) return {};
  const item = SEO_SOLUTIONS[params.slug];
  const url = `${BASE_URL}/solutions/${params.slug}`;
  return {
    title: `${item.title} | پیوو`, description: item.description,
    keywords: [item.title, item.audience, "نرم افزار مدیریت تعمیرگاه", "فاکتور تعمیرگاه", "مدیریت مشتری تعمیرگاه"],
    alternates: { canonical: url },
    openGraph: { title: `${item.title} | پیوو`, description: item.description, url, siteName: "پیوو", locale: "fa_IR", type: "website", images: [{ url: `${BASE_URL}/icons/logo-full.png`, width: 1200, height: 630, alt: item.title }] },
  };
}

export default function SolutionPage({ params }: { params: { slug: string } }) {
  if (!isSeoSolutionSlug(params.slug)) notFound();
  const item = SEO_SOLUTIONS[params.slug];
  const related = Object.entries(SEO_SOLUTIONS).filter(([slug]) => slug !== params.slug).slice(0, 3) as [SeoSolutionSlug, typeof item][];
  const url = `${BASE_URL}/solutions/${params.slug}`;
  const schema = {
    "@context": "https://schema.org", "@graph": [
      { "@type": "SoftwareApplication", name: "پیوو", alternateName: "Peyvo", applicationCategory: "BusinessApplication", operatingSystem: "Web, Android", url, description: item.description, offers: { "@type": "Offer", price: "0", priceCurrency: "IRR", description: "شروع رایگان" }, publisher: { "@type": "Organization", name: "پیوو", url: BASE_URL } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "پیوو", item: BASE_URL }, { "@type": "ListItem", position: 2, name: "راهکارها", item: `${BASE_URL}/#solutions` }, { "@type": "ListItem", position: 3, name: item.title, item: url }] },
      { "@type": "FAQPage", mainEntity: item.questions.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) },
    ],
  };
  return <main className={`solution-page solution-${item.category.toLowerCase()}`} dir="rtl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <header className="solution-nav"><Link href="/" aria-label="صفحه اصلی پیوو"><Logo size={34} textClassName="text-xl" /></Link><nav><Link href="/#features">امکانات</Link><Link href="/download">دانلود</Link><Link href="/login">ورود</Link><Link className="solution-nav-cta" href={`/signup?category=${item.category}`}>شروع رایگان</Link></nav></header>
    <section className="solution-hero"><div><span>{item.eyebrow}</span><h1>{item.title}</h1><p>{item.description}</p><div className="solution-actions"><Link href={`/signup?category=${item.category}`}>ساخت رایگان تعمیرگاه <ArrowLeft size={18}/></Link><Link href="/#features">مشاهده امکانات</Link></div><small><ShieldCheck size={15}/> شروع بدون هزینه راه‌اندازی · پشتیبانی فارسی</small></div><aside><div className="solution-dashboard-preview"><div><b>وضعیت امروز</b><span>داشبورد تخصصی {item.category === "MOBILE" ? "موبایل" : item.category === "COMPUTER" ? "کامپیوتر" : "صنف شما"}</span></div><section><i><ClipboardCheck/><small>پذیرش</small><strong>۱۲</strong></i><i><Wrench/><small>در حال انجام</small><strong>۸</strong></i><i><PackageCheck/><small>آماده تحویل</small><strong>۴</strong></i></section><div className="solution-preview-line"><i/><i/><i/><i/><i/></div></div></aside></section>
    <section className="solution-strip"><span><UsersRound/> مدیریت مشتریان</span><span><ClipboardCheck/> پذیرش تخصصی</span><span><ReceiptText/> فاکتور و تسویه</span><span><PackageCheck/> انبار و قطعات</span></section>
    <section className="solution-section"><div className="solution-section-head"><span>امکانات متناسب با کار شما</span><h2>از پذیرش تا تسویه، در یک جریان مشخص</h2><p>فرم‌ها و داشبورد پیوو بر اساس نوع فعالیت تعمیرگاه تنظیم می‌شوند تا اطلاعات نامرتبط وارد کار روزانه شما نشود.</p></div><div className="solution-features">{item.items.map((feature, index) => <article key={feature}><i>{String(index + 1).padStart(2, "0")}</i><Check/><h3>{feature}</h3></article>)}</div></section>
    <section className="solution-section solution-use"><div><span>مناسب برای</span><h2>{item.audience}</h2><p>بدون نیاز به نصب پیچیده، فضای کاری را بسازید و همان روز اولین پذیرش را ثبت کنید. نسخه وب و اندروید در دسترس است.</p><Link href={`/signup?category=${item.category}`}>ایجاد فضای کاری <ArrowLeft size={17}/></Link></div><div><Wrench size={34}/><strong>پرونده کامل هر تعمیر</strong><p>مشخصات دستگاه یا تجهیز، شرح خرابی، وضعیت، هزینه‌ها، پرداخت‌ها و پیام‌های مشتری یک‌جا نگهداری می‌شوند.</p></div></section>
    <section className="solution-section solution-faq"><div className="solution-section-head"><span>پرسش‌های متداول</span><h2>پاسخ کوتاه به سؤال‌های پیش از شروع</h2></div>{item.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <section className="solution-section"><div className="solution-related"><h2>راهکارهای دیگر پیوو</h2><div>{related.map(([slug, solution]) => <Link key={slug} href={`/solutions/${slug}`}><span>{solution.eyebrow}</span><strong>{solution.title}</strong><ArrowLeft size={16}/></Link>)}</div></div></section>
    <section className="solution-final"><h2>تعمیرگاهتان را منظم‌تر مدیریت کنید</h2><p>رایگان شروع کنید و پیوو را با جریان واقعی کار خودتان بسنجید.</p><Link href={`/signup?category=${item.category}`}>شروع رایگان <ArrowLeft size={18}/></Link></section>
    <footer><Link href="/"><Logo size={30}/></Link><span>پیوو؛ سامانه مدیریت تعمیرگاه و خدمات پس از فروش</span><Link href="/privacy">حریم خصوصی</Link><Link href="/terms">قوانین</Link></footer>
  </main>;
}
