import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { db } from "@/lib/db";
import { LATEST_ANDROID_RELEASE } from "@/lib/app-release";
import PwaInstallButton from "@/components/PwaInstallButton";
import { getPublicLocale, publicPath, PUBLIC_LANGUAGE_LABELS, type PublicLocale } from "@/lib/public-locales";

export const dynamic = "force-dynamic";

const DOWNLOAD_COPY = {
  fa: { title: "اپلیکیشن پیوو", description: "پیوو را روی موبایل یا دسکتاپ، از مسیر دلخواه خود نصب کنید.", version: "نسخه", apk: "فایل APK نسخه", direct: "دانلود مستقیم", official: "انتشار رسمی", bazaar: "دریافت از کافه‌بازار", myket: "دریافت از مایکت", pendingLink: "در انتظار ثبت نشانی", reviewing: "در حال بررسی و انتشار", installTitle: "راهنمای نصب فایل APK", installHelp: "پس از دانلود، فایل را باز کنید. اگر پیام «نصب برنامه‌های ناشناس» آمد، اجازه بدهید و سپس «نصب» را بزنید. برای به‌روزرسانی‌های بعدی نیز از همین صفحه استفاده کنید.", back: "بازگشت به صفحه اصلی", language: "انتخاب زبان" },
  en: { title: "Get the Peyvo app", description: "Install Peyvo on mobile or desktop using the option that works best for you.", version: "Version", apk: "APK version", direct: "Direct download", official: "Official release", bazaar: "Get it from Cafe Bazaar", myket: "Get it from Myket", pendingLink: "Store link coming soon", reviewing: "Under review and publishing", installTitle: "How to install the APK", installHelp: "Open the downloaded file. If Android asks for permission to install unknown apps, allow it and then choose Install. Return to this page for future updates.", back: "Back to home", language: "Choose language" },
  ar: { title: "تحميل تطبيق Peyvo", description: "ثبّت Peyvo على الهاتف أو سطح المكتب بالطريقة التي تناسبك.", version: "الإصدار", apk: "ملف APK للإصدار", direct: "تحميل مباشر", official: "إصدار رسمي", bazaar: "التحميل من Cafe Bazaar", myket: "التحميل من Myket", pendingLink: "رابط المتجر سيتوفر قريباً", reviewing: "قيد المراجعة والنشر", installTitle: "طريقة تثبيت ملف APK", installHelp: "افتح الملف بعد تنزيله. إذا طلب أندرويد السماح بتثبيت تطبيقات غير معروفة، وافق ثم اختر «تثبيت». ارجع إلى هذه الصفحة للحصول على التحديثات القادمة.", back: "العودة إلى الرئيسية", language: "اختيار اللغة" },
} as const;

export function generateMetadata({ searchParams }: { searchParams?: { lang?: string | string[] } }): Metadata {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = DOWNLOAD_COPY[locale];
  return { title: `${copy.title} | Peyvo`, description: copy.description };
}

// Public "get the Android app" page. The three links are set by the super admin
// (تنظیمات ← سایر ← اپلیکیشن اندروید) once the APK is built and the store
// listings are live, so this page needs no redeploy to go live.
export default async function DownloadPage({ searchParams }: { searchParams?: { lang?: string | string[] } }) {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = DOWNLOAD_COPY[locale];
  // Myket/Bazaar builds must update only through their own store.  Fail
  // closed before rendering any direct-APK or competing-store link.
  if (/\bPeyvoNativeApp\b/i.test(headers().get("user-agent") || "")) redirect("/login");

  let s: any = null;
  try {
    s = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    // fall through to the "coming soon" state
  }
  const apk = s?.androidApkUrl || LATEST_ANDROID_RELEASE.directApkUrl;
  const bazaar = /^https:\/\/(?:www\.)?cafebazaar\.ir\//i.test(s?.bazaarUrl || "") ? s.bazaarUrl : "";
  const myket = /^https:\/\/(?:www\.)?myket\.ir\//i.test(s?.myketUrl || "") ? s.myketUrl : "";
  return (
    <main className="home-v2 min-h-screen flex flex-col items-center justify-center px-5 py-12" lang={locale} dir={locale === "en" ? "ltr" : "rtl"}>
      <div className="w-full max-w-2xl text-center">
        <div className="home-language mx-auto mb-7 w-max" aria-label={copy.language}>
          {(["fa", "en", "ar"] as PublicLocale[]).map((item) => <Link key={item} href={publicPath(item, "/download")} className={item === locale ? "active" : ""} aria-current={item === locale ? "page" : undefined}>{PUBLIC_LANGUAGE_LABELS[item]}</Link>)}
        </div>
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Peyvo" width={88} height={88} className="rounded-2xl shadow-lg" />
        </div>
        <h1 className="display-heading text-2xl mb-1">{copy.title}</h1>
        <p className="text-xs text-muted mb-8">{copy.description}</p>
        <div className="mb-4 inline-flex rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[10px] font-bold text-teal">{copy.version} {LATEST_ANDROID_RELEASE.versionName}</div>

          <div className="home-install-panel home-download-grid">
            <PwaInstallButton locale={locale} />
            {apk && (
              <a href={apk} className="home-store-choice is-direct">
                <i><img src="/icons/icon-mark.png" alt="" /></i>
                <span><small>{copy.apk} {LATEST_ANDROID_RELEASE.versionName}</small><strong>{copy.direct}</strong></span>
              </a>
            )}
            {bazaar && (
              <a href={bazaar} target="_blank" rel="noopener noreferrer" className="home-store-choice">
                <i><img src="/images/trust/cafebazaar-official.png" alt="" /></i>
                <span><small>{copy.official}</small><strong>{copy.bazaar}</strong></span>
              </a>
            )}
            {!bazaar && (
              <div className="home-store-choice is-pending">
                <i><img src="/images/trust/cafebazaar-official.png" alt="" /></i>
                <span><small>{copy.pendingLink}</small><strong>{locale === "fa" ? "کافه‌بازار" : "Cafe Bazaar"}</strong></span>
              </div>
            )}
            {myket && (
              <a href={myket} target="_blank" rel="noopener noreferrer" className="home-store-choice">
                <i><img src="/images/trust/myket-official.png" alt="" /></i>
                <span><small>{copy.official}</small><strong>{copy.myket}</strong></span>
              </a>
            )}
            {!myket && (
              <div className="home-store-choice is-pending">
                <i><img src="/images/trust/myket-official.png" alt="" /></i>
                <span><small>{copy.reviewing}</small><strong>{locale === "fa" ? "مایکت" : "Myket"}</strong></span>
              </div>
            )}
          </div>

        {apk && (
          <div className="bg-surface2/60 border border-surface2 rounded-xl p-3 mt-5 text-start">
            <div className="text-[11px] font-bold mb-1">{copy.installTitle}</div>
            <p className="text-[10px] text-muted leading-relaxed">
              {copy.installHelp}
            </p>
          </div>
        )}

        <Link href={publicPath(locale)} className="inline-block text-[11px] text-copper mt-8">← {copy.back}</Link>
      </div>
    </main>
  );
}
