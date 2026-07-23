import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import DigitInputFixer from "@/components/DigitInputFixer";
import MobilePreviewToggle from "@/components/MobilePreviewToggle";

export const metadata: Metadata = {
  title: "Peyvo | پیوند تعمیرکار، فروشنده و مشتری",
  description: "پیوو (Peyvo) — مدیریت گردش‌کار چندتخصصی تعمیر موبایل و پیوند تعمیرکار، فروشنده و مشتری",
  manifest: "/manifest.json",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="dark">
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <DigitInputFixer />
        <MobilePreviewToggle />
      </body>
    </html>
  );
}
