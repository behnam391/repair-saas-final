import Link from "next/link";
import Logo from "@/components/Logo";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public "get the Android app" page. The three links are set by the super admin
// (تنظیمات ← سایر ← اپلیکیشن اندروید) once the APK is built and the store
// listings are live, so this page needs no redeploy to go live.
export default async function DownloadPage() {
  let s: any = null;
  try {
    s = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    // fall through to the "coming soon" state
  }
  const apk = s?.androidApkUrl || "";
  const bazaar = s?.bazaarUrl || "";
  const myket = s?.myketUrl || "";
  const anything = apk || bazaar || myket;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Peyvo" width={88} height={88} className="rounded-2xl shadow-lg" />
        </div>
        <h1 className="display-heading text-2xl mb-1">اپلیکیشن پیوو</h1>
        <p className="text-xs text-muted mb-8">پنل تعمیرگاه و مشتریان، همیشه در جیبت — روی اندروید.</p>

        {!anything ? (
          <div className="bg-surface border border-surface2 rounded-2xl p-6">
            <div className="text-3xl mb-2">📱</div>
            <p className="text-sm text-muted">اپلیکیشن اندروید به‌زودی روی کافه‌بازار، مایکت و همین‌جا برای دانلود در دسترس خواهد بود.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apk && (
              <a href={apk}
                className="flex items-center justify-center gap-2 bg-copper text-[#0A0F1E] font-extrabold rounded-xl py-3.5 text-sm">
                ⬇️ دانلود مستقیم (فایل APK)
              </a>
            )}
            {bazaar && (
              <a href={bazaar} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-surface2 border border-surface2 rounded-xl py-3 text-sm font-bold hover:border-copper/40 transition">
                🛍️ دریافت از کافه‌بازار
              </a>
            )}
            {myket && (
              <a href={myket} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-surface2 border border-surface2 rounded-xl py-3 text-sm font-bold hover:border-copper/40 transition">
                🟢 دریافت از مایکت
              </a>
            )}
          </div>
        )}

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
    </div>
  );
}
