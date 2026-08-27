import "./globals.css";
import "./styles/public-experience.css";
import "./styles/home-premium.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "./providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import DigitInputFixer from "@/components/DigitInputFixer";
import MobilePreviewToggle from "@/components/MobilePreviewToggle";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import AppUpdateNotice from "@/components/AppUpdateNotice";
import { db } from "@/lib/db";
import { getFont, DEFAULT_FONT } from "@/lib/fonts";

// The root layout reads the live font/theme choice from PlatformSettings on
// every request (see the super-admin تنظیمات panel), so changing them applies
// site-wide with no redeploy. That DB read makes the whole app render at
// request time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peyvo | پیوند تعمیرکار، فروشنده و مشتری",
  description: "پیوو (Peyvo) — مدیریت گردش‌کار چندتخصصی تعمیر موبایل و پیوند تعمیرکار، فروشنده و مشتری",
  manifest: "/manifest.json",
  // Enamad (نماد اعتماد الکترونیکی) domain-ownership verification meta tag.
  // Renders <meta name="enamad" content="64662765"> in the site <head> on
  // every page (including the home page Enamad checks). Harmless to keep
  // permanently after verification.
  other: { enamad: "64662765" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14161B",
};

// Never let a settings-read failure block the whole app from rendering — fall
// back to the built-in defaults (Vazirmatn, dark) if the DB is unreachable.
async function getAppearance(): Promise<{ fontKey: string; theme: string }> {
  try {
    const s = (await db.platformSettings.findUnique({ where: { id: "singleton" } })) as any;
    return {
      fontKey: s?.fontFamily || DEFAULT_FONT.key,
      theme: s?.defaultTheme === "light" ? "light" : "dark",
    };
  } catch {
    return { fontKey: DEFAULT_FONT.key, theme: "dark" };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { fontKey, theme } = await getAppearance();
  const font = getFont(fontKey);
  const isNativeApp = /\bPeyvoNativeApp\b/i.test(headers().get("user-agent") || "");

  return (
    // --app-font is set as an inline CSS variable right on <html> (read by
    // globals.css `body`). Doing it here — rather than via a separate <style>
    // element — keeps the markup valid and avoids a hydration mismatch.
    <html
      lang="fa"
      dir="rtl"
      data-theme={theme}
      style={{ ["--app-font" as any]: font.family }}
    >
      <body>
        {/* Anti-flash: apply a returning visitor's saved theme before paint so
            they don't see the platform default flash first. Falls through to
            the server-rendered data-theme for first-time visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}",
          }}
        />
        {/* Extra font stylesheet only when a non-default font is chosen —
            Vazirmatn is already imported by globals.css. Placed inside <body>
            (valid, and React hoists rel=stylesheet links) rather than as a
            raw child of <html>. */}
        {font.url && <link rel="stylesheet" href={font.url} />}
        <Providers isNativeApp={isNativeApp}>{children}</Providers>
        <ServiceWorkerRegister />
        <DigitInputFixer />
        <MobilePreviewToggle />
        <ClientErrorReporter />
        <AppUpdateNotice />
      </body>
    </html>
  );
}
