import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { db } from "@/lib/db";
import { LATEST_ANDROID_RELEASE } from "@/lib/app-release";
import PwaInstallButton from "@/components/PwaInstallButton";

export const dynamic = "force-dynamic";

// Public "get the Android app" page. The three links are set by the super admin
// (تنظیمات ← سایر ← اپلیکیشن اندروید) once the APK is built and the store
// listings are live, so this page needs no redeploy to go live.
export default async function DownloadPage() {
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
    <main className="home-v2 min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-2xl text-center">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Peyvo" width={88} height={88} className="rounded-2xl shadow-lg" />
        </div>
        <h1 className="display-heading text-2xl mb-1">اپلیکیشن پیوو</h1>
        <p className="text-xs text-muted mb-8">پیوو را روی موبایل یا دسکتاپ، از مسیر دلخواه خود نصب کنید.</p>
        <div className="mb-4 inline-flex rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[10px] font-bold text-teal">نسخه {LATEST_ANDROID_RELEASE.versionName}</div>

          <div className="home-install-panel home-download-grid">
            <PwaInstallButton />
            {apk && (
              <a href={apk} className="home-store-choice is-direct">
                <i><img src="/icons/icon-mark.png" alt="" /></i>
                <span><small>فایل APK نسخه {LATEST_ANDROID_RELEASE.versionName}</small><strong>دانلود مستقیم</strong></span>
              </a>
            )}
            {bazaar && (
              <a href={bazaar} target="_blank" rel="noopener noreferrer" className="home-store-choice">
                <i><img src="/images/trust/cafebazaar-official.png" alt="" /></i>
                <span><small>انتشار رسمی</small><strong>دریافت از کافه‌بازار</strong></span>
              </a>
            )}
            {!bazaar && (
              <div className="home-store-choice is-pending">
                <i><img src="/images/trust/cafebazaar-official.png" alt="" /></i>
                <span><small>در انتظار ثبت نشانی</small><strong>کافه‌بازار</strong></span>
              </div>
            )}
            {myket && (
              <a href={myket} target="_blank" rel="noopener noreferrer" className="home-store-choice">
                <i><img src="/images/trust/myket-official.png" alt="" /></i>
                <span><small>انتشار رسمی</small><strong>دریافت از مایکت</strong></span>
              </a>
            )}
            {!myket && (
              <div className="home-store-choice is-pending">
                <i><img src="/images/trust/myket-official.png" alt="" /></i>
                <span><small>در حال بررسی و انتشار</small><strong>مایکت</strong></span>
              </div>
            )}
          </div>

        {apk && (
          <div className="bg-surface2/60 border border-surface2 rounded-xl p-3 mt-5 text-right">
            <div className="text-[11px] font-bold mb-1">راهنمای نصب فایل APK</div>
            <p className="text-[10px] text-muted leading-relaxed">
              پس از دانلود، فایل را باز کن. اگر پیام «نصب برنامه‌های ناشناس» آمد، اجازه بده و بعد «نصب» را بزن. برای به‌روزرسانی‌های بعدی هم از همین صفحه استفاده کن.
            </p>
          </div>
        )}

        <Link href="/" className="inline-block text-[11px] text-copper mt-8">← بازگشت به صفحه اصلی</Link>
      </div>
    </main>
  );
}
