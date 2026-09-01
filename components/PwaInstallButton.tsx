"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

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
    window.alert("برای نصب پیوو، منوی مرورگر را باز کنید و گزینه «افزودن به صفحه اصلی» یا «Install app» را بزنید.");
  }

  return (
    <button type="button" className={`home-store-choice is-pwa${installed ? " is-installed" : ""}`} onClick={install}>
      <i><img src="/icons/icon-mark.png" alt="" /></i>
      <span><small>{installed ? "روی این دستگاه نصب شده" : "نصب بدون دانلود فایل"}</small><strong>{installed ? "نسخه وب نصب‌شده" : "نصب نسخه PWA"}</strong></span>
    </button>
  );
}
