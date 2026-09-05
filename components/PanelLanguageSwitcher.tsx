"use client";

import { Globe2 } from "lucide-react";
import { usePanelI18n, type PanelLocale } from "@/lib/panel-i18n";

export default function PanelLanguageSwitcher() {
  const { locale, setLocale } = usePanelI18n();
  return (
    <label className="panel-language-switcher" title="Language / اللغة / زبان">
      <Globe2 size={16} />
      <select value={locale} onChange={(event) => setLocale(event.target.value as PanelLocale)} aria-label="Language / اللغة / زبان">
        <option value="fa">فارسی</option>
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </label>
  );
}
