import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowLeft, ArrowRight, BarChart3, Check, Clock3, Download, Globe2,
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
import { HOME_COPY, getPublicLocale, publicPath, PUBLIC_LANGUAGE_LABELS, type PublicLocale } from "@/lib/public-locales";

export const dynamic = "force-dynamic";

const featureVisuals = [
  { icon: Wrench, index: "01", tone: "blue", wide: true },
  { icon: MessageSquareText, index: "02", tone: "green" },
  { icon: BarChart3, index: "03", tone: "violet" },
  { icon: PackageCheck, index: "04", tone: "amber" },
  { icon: QrCode, index: "05", tone: "cyan" },
  { icon: UsersRound, index: "06", tone: "green", wide: true },
];

const BASE_URL = "https://peyvo.ir";

export function generateMetadata({ searchParams }: { searchParams?: { lang?: string | string[] } }): Metadata {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = HOME_COPY[locale];
  const canonicalPath = publicPath(locale);
  return {
    title: copy.seo.title,
    description: copy.seo.description,
    alternates: {
      canonical: `${BASE_URL}${canonicalPath === "/" ? "" : canonicalPath}`,
      languages: {
        "fa-IR": `${BASE_URL}/`,
        en: `${BASE_URL}/en`,
        ar: `${BASE_URL}/ar`,
        "x-default": `${BASE_URL}/`,
      },
    },
    openGraph: {
      title: copy.seo.title,
      description: copy.seo.description,
      url: `${BASE_URL}${canonicalPath === "/" ? "" : canonicalPath}`,
      siteName: "Peyvo",
      locale: locale === "fa" ? "fa_IR" : locale === "ar" ? "ar_AR" : "en_US",
      type: "website",
    },
  };
}

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

function StoreChoice({ href, store, label, logo, pending, pendingAria }: { href: string; store: string; label: string; logo: string; pending: string; pendingAria: string }) {
  const body = <><i><img src={logo} alt="" /></i><span><small>{href ? label : pending}</small><strong>{store}</strong></span></>;
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="home-store-choice">{body}</a>
    : <div className="home-store-choice is-pending" aria-label={`${store}; ${pendingAria}`}>{body}</div>;
}

function StoreTrustBadge({
  href, store, logo, publishedLabel, pendingLabel, officialPage, officialLogo,
}: {
  href: string;
  store: string;
  logo: string;
  publishedLabel: string;
  pendingLabel: string;
  officialPage: string;
  officialLogo: string;
}) {
  const logoNode = (
    <span className="home-store-seal-logo">
      <img src={logo} alt={`${officialLogo} ${store}`} />
    </span>
  );

  return (
    <article className={`home-store-seal ${href ? "is-published" : "is-pending"}`}>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${officialPage}: ${store}`}>{logoNode}</a>
        : logoNode}
      <strong>{href ? publishedLabel : store}</strong>
      <small>{href ? officialPage : pendingLabel}</small>
    </article>
  );
}

export default async function Home({ searchParams }: { searchParams?: { lang?: string | string[] } }) {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = HOME_COPY[locale];
  const DirectionArrow = locale === "en" ? ArrowRight : ArrowLeft;
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
    <main className="landing-root home-v2" lang={copy.locale} dir={copy.dir}>
      <div className="home-atmosphere" aria-hidden><i /><i /><i /></div>

      <header className="home-header">
        <div className="home-nav">
          <Link href={publicPath(locale)} aria-label={copy.nav.home} className="home-brand"><Logo size={32} textClassName="text-xl" /></Link>
          <nav className="home-nav-links" aria-label={copy.nav.aria}>
            <a href="#product">{copy.nav.product}</a>
            <a href="#features">{copy.nav.features}</a>
            <a href="#workflow">{copy.nav.workflow}</a>
            <a href="#trust">{copy.nav.trust}</a>
          </nav>
          <div className="home-nav-actions">
            <div className="home-language" aria-label={copy.nav.language} title={copy.nav.language}>
              <Globe2 size={15} />
              {(["fa", "en", "ar"] as PublicLocale[]).map((item) => (
                <Link key={item} href={publicPath(item)} className={item === locale ? "active" : ""} aria-current={item === locale ? "page" : undefined}>{PUBLIC_LANGUAGE_LABELS[item]}</Link>
              ))}
            </div>
            <ThemeToggle className="home-theme-toggle" label={locale === "en" ? "Switch colour theme" : locale === "ar" ? "تبديل السمة" : "تغییر حالت شب و روز"} />
            <Link href="/login" className="home-nav-login">{copy.nav.login}</Link>
            <Link href={publicPath(locale, "/download")} className="home-nav-download"><Download size={15} /> {copy.nav.download}</Link>
          </div>
        </div>
      </header>

      <section className="home-hero" id="product">
        <div className="home-hero-copy">
          <div className="home-eyebrow"><span><i /> {copy.hero.online}</span><b>{copy.hero.audience}</b></div>
          <h1><em>{copy.hero.brand}</em> {copy.hero.title}</h1>
          <p>{copy.hero.description}</p>
          <div className="home-hero-actions">
            <Link href="/signup" className="home-primary-action">{copy.hero.start} <DirectionArrow size={18} /></Link>
            <Link href="/customer/login" className="home-secondary-action"><Smartphone size={17} /> {copy.hero.customerLogin}</Link>
          </div>
          <div className="home-reassurance">
            <span><Check size={13} /> {copy.hero.free}</span>
            <span><Check size={13} /> {copy.hero.fast}</span>
            <span><Check size={13} /> {copy.hero.support}</span>
          </div>

          <div className="home-install-panel" aria-label={copy.hero.installAria}>
            <PwaInstallButton locale={locale} />
            <a href={appLinks.apk || "/download"} className="home-store-choice is-direct">
              <i><img src="/icons/icon-mark.png" alt="" /></i><span><small>{copy.hero.version} {LATEST_ANDROID_RELEASE.versionName}</small><strong>{copy.hero.direct}</strong></span>
            </a>
            <StoreChoice href={appLinks.bazaar} store={locale === "fa" ? "کافه‌بازار" : "Cafe Bazaar"} label={copy.store.getFrom} logo="/images/trust/cafebazaar-official.png" pending={copy.store.pending} pendingAria={copy.store.underReviewAria} />
            <StoreChoice href={appLinks.myket} store={locale === "fa" ? "مایکت" : "Myket"} label={copy.store.getFrom} logo="/images/trust/myket-official.png" pending={copy.store.pending} pendingAria={copy.store.underReviewAria} />
          </div>
        </div>

        <div className="home-ai-visual" aria-label={copy.ai.visualAria}>
          <div className="home-ai-board" aria-hidden="true">
            <div className="home-ai-board-head"><span><i /> {copy.ai.liveStatus}</span><b>{copy.ai.today}</b></div>
            <div className="home-ai-board-flow">
              <span><i /> {copy.ai.reception}</span><span><i /> {copy.ai.repairing}</span><span><i /> {copy.ai.ready}</span>
            </div>
            <div className="home-ai-board-line"><i /><i /><i /><i /><i /></div>
            <div className="home-ai-board-note"><Sparkles size={15} /><span><b>{copy.ai.assistant}</b><small>{copy.ai.importantToday}</small></span></div>
          </div>
          <div className="home-mascot-halo" aria-hidden="true" />
          <Image className="home-ai-mascot" src="/images/peyvo-ai-assistant-v2.png" alt={copy.ai.mascotAlt} width={520} height={740} priority sizes="(max-width: 760px) 250px, 410px" />
          <span className="home-ai-caption"><Sparkles size={14} /> {copy.ai.caption}</span>
        </div>

      </section>

      <section className="home-proof" aria-label={copy.proof.aria}>
        <div><strong>{copy.proof.version} {LATEST_ANDROID_RELEASE.versionName}</strong><small>{copy.proof.operational}</small></div>
        <span><ShieldCheck /> {copy.proof.verified}</span>
        <span><Smartphone /> {copy.proof.platforms}</span>
        <span><Clock3 /> {copy.proof.completeCycle}</span>
        <span><Headphones /> {copy.proof.support}</span>
      </section>

      <section id="features" className="home-section home-capabilities">
        <div className="home-section-head">
          <span><Sparkles size={14} /> {copy.capabilities.kicker}</span>
          <h2>{copy.capabilities.title}</h2>
          <p>{copy.capabilities.description}</p>
        </div>
        <div className="home-bento">
          {featureVisuals.map(({ icon: Icon, index, tone, wide }, featureIndex) => {
            const feature = copy.capabilities.features[featureIndex];
            return (
            <article key={feature.title} className={`home-feature tone-${tone} ${wide ? "is-wide" : ""}`}>
              <div className="home-feature-top"><i><Icon size={21} /></i><span>{index}</span></div>
              <h3>{feature.title}</h3><p>{feature.text}</p>
              {wide && <div className="home-feature-signal" aria-hidden><i /><i /><i /><i /><span /></div>}
            </article>
          )})}
        </div>
      </section>

      <section className="home-section home-intelligence">
        <div className="home-intelligence-copy">
          <span><Sparkles size={14} /> {copy.intelligence.kicker}</span>
          <h2>{copy.intelligence.title}<br /><em>{copy.intelligence.accent}</em></h2>
          <p>{copy.intelligence.description}</p>
          <div><span><Check size={13} /> {copy.intelligence.bottleneck}</span><span><Check size={13} /> {copy.intelligence.inventory}</span><span><Check size={13} /> {copy.intelligence.finance}</span></div>
        </div>
      </section>

      <section id="workflow" className="home-section home-workflow">
        <div className="home-section-head compact"><span>{copy.workflow.kicker}</span><h2>{copy.workflow.title}</h2></div>
        <div className="home-workflow-grid">
          {copy.workflow.steps.map((step, index) => <article key={step.n}><div><span>{step.n}</span>{index < copy.workflow.steps.length - 1 && <i />}</div><h3>{step.title}</h3><p>{step.text}</p></article>)}
        </div>
      </section>

      <section id="trust" className="home-section home-trust">
        <div className="home-trust-copy">
          <span><ShieldCheck size={15} /> {copy.trust.kicker}</span>
          <h2>{copy.trust.title}</h2>
          <p>{copy.trust.description}</p>
          <div><span><Check size={12} /> {copy.trust.domain}</span><span><Check size={12} /> {copy.trust.identity}</span><span><Check size={12} /> {copy.trust.app}</span></div>
        </div>
        <div className="home-seals">
          <article><EnamadServerBadge /><strong>{copy.trust.enamad}</strong><small>{copy.trust.enamadSub}</small></article>
          <article><ZarinpalTrustBadge /><strong>{copy.trust.zarinpal}</strong><small>{copy.trust.zarinpalSub}</small></article>
          <StoreTrustBadge href={appLinks.bazaar} store={locale === "fa" ? "کافه‌بازار" : "Cafe Bazaar"} logo="/images/trust/cafebazaar-official.png" publishedLabel={copy.trust.bazaarPublished} pendingLabel={copy.store.pending} officialPage={copy.store.officialPage} officialLogo={copy.store.officialLogo} />
          <StoreTrustBadge href={appLinks.myket} store={locale === "fa" ? "مایکت" : "Myket"} logo="/images/trust/myket-official.png" publishedLabel={copy.trust.myketPublished} pendingLabel={copy.store.pending} officialPage={copy.store.officialPage} officialLogo={copy.store.officialLogo} />
        </div>
      </section>

      <section className="home-final">
        <div className="home-final-glow" aria-hidden />
        <span>{copy.final.kicker}</span>
        <h2>{copy.final.titleLine1}<br />{copy.final.titleLine2}</h2>
        <p>{copy.final.description}</p>
        <div><Link href="/signup" className="home-primary-action">{copy.final.account} <DirectionArrow size={18} /></Link><Link href={publicPath(locale, "/download")} className="home-final-download"><Download size={16} /> {copy.final.download}</Link></div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-main">
          <div className="home-footer-brand"><Logo size={34} /><p>{copy.footer.tagline}</p><div><i /> {copy.footer.online}</div></div>
          <div><strong>{copy.footer.product}</strong><a href="#features">{copy.footer.features}</a><a href="#workflow">{copy.footer.workflow}</a><Link href={publicPath(locale, "/download")}>{copy.footer.download}</Link></div>
          <div><strong>{copy.footer.access}</strong><Link href="/login">{copy.footer.shopLogin}</Link><Link href="/customer/login">{copy.footer.customerLogin}</Link><Link href="/signup">{copy.footer.signup}</Link></div>
          <div><strong>{copy.footer.supportAndLegal}</strong><a href="mailto:support@peyvo.ir">{copy.footer.support}</a><Link href={publicPath(locale, "/terms")}>{copy.footer.terms}</Link><Link href={publicPath(locale, "/privacy")}>{copy.footer.privacy}</Link></div>
          <div className="home-footer-seal"><EnamadBadge /><small>{copy.footer.verified}</small></div>
        </div>
        <div className="home-footer-bottom"><span>{copy.footer.copyright}</span><span>{copy.footer.madeFor}</span></div>
      </footer>
    </main>
  );
}
