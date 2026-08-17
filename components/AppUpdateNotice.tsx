"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { canCheckNativeVersion, getNativeAppVersion } from "@/lib/native-app-version";

type Release = { versionCode: number; versionName: string; downloadUrl: string; notes: string[] };

export default function AppUpdateNotice() {
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    if (!canCheckNativeVersion()) return;
    Promise.all([
      getNativeAppVersion(),
      fetch("/api/app-version", { cache: "no-store" }).then((res) => res.json()),
    ]).then(([installed, latest]) => {
      const dismissed = localStorage.getItem("dismissed-app-version");
      if (Number(latest.versionCode) > Number(installed.versionCode) && dismissed !== String(latest.versionCode)) setRelease(latest);
    }).catch(() => {});
  }, []);

  if (!release) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[400] mx-auto max-w-sm rounded-2xl border border-teal/40 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal"><Download size={20} /></span>
        <div className="min-w-0 flex-1">
          <b className="text-sm">نسخه جدید پیوو {release.versionName}</b>
          <p className="mt-1 text-[10px] leading-5 text-muted">{release.notes.slice(0, 2).join(" · ")}</p>
        </div>
        <button onClick={() => { localStorage.setItem("dismissed-app-version", String(release.versionCode)); setRelease(null); }} className="text-muted"><X size={16} /></button>
      </div>
      <a href={release.downloadUrl} className="mt-3 flex w-full items-center justify-center rounded-xl bg-teal py-2.5 text-xs font-bold text-[#0B1512]">مشاهده و دریافت به‌روزرسانی</a>
    </div>
  );
}
