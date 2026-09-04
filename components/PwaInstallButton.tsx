"use client";

import { useEffect, useState } from "react";
import type { PublicLocale } from "@/lib/public-locale-core";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const copy: Record<PublicLocale, { installedHint: string; installHint: string; installed: string; install: string; help: string }> = {
  fa: {
    installedHint: "روی این دستگاه نصب شده", installHint: "نصب بدون دانلود فایل",
    installed: "نسخه وب نصب‌شده", install: "نصب نسخه PWA",
    help: "برای نصب پیوو، منوی مرورگر را باز کنید و گزینه «افزودن به صفحه اصلی» یا «Install app» را بزنید.",
  },
  en: {
    installedHint: "Installed on this device", installHint: "Install without an APK",
    installed: "Web app installed", install: "Install the PWA",
    help: "Open your browser menu and choose “Install app” or “Add to Home Screen” to install Peyvo.",
  },
  ar: {
    installedHint: "مثبّت على هذا الجهاز", installHint: "تثبيت من دون ملف APK",
    installed: "تطبيق الويب مثبّت", install: "تثبيت نسخة PWA",
    help: "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» لتثبيت Peyvo.",
  },
};

export default function PwaInstallButton({ locale = "fa" }: { locale?: PublicLocale }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const labels = copy[locale];

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installed) return;
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setPromptEvent(null);
      return;
    }
    window.alert(labels.help);
  }

  return (
    <button type="button" className={`home-store-choice is-pwa${installed ? " is-installed" : ""}`} onClick={install}>
      <i><img src="/icons/icon-mark.png" alt="" /></i>
      <span><small>{installed ? labels.installedHint : labels.installHint}</small><strong>{installed ? labels.installed : labels.install}</strong></span>
    </button>
  );
}
