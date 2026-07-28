// ── Site font catalog ─────────────────────────────────────────
// A curated set of Persian-capable fonts, all loadable straight from
// Google Fonts. The super admin picks one in the settings panel; the
// key is stored in PlatformSettings.fontFamily, and the root layout
// (app/layout.tsx) loads the matching stylesheet + sets the --app-font
// CSS variable that globals.css `body` reads.
//
// `url: null` means the font is ALREADY bundled by globals.css (Vazirmatn,
// the default) so no extra <link> is injected for it.

export type FontOption = {
  key: string;
  label: string; // shown in the picker (Persian)
  note: string; // one-line character description
  family: string; // exact CSS font-family value (with fallbacks)
  url: string | null; // Google Fonts stylesheet href, or null if already loaded
};

export const FONT_OPTIONS: FontOption[] = [
  {
    key: "vazirmatn",
    label: "وزیرمتن",
    note: "پیش‌فرض — مدرن، خوانا و کامل",
    family: "'Vazirmatn', sans-serif",
    url: null,
  },
  {
    key: "noto-sans-arabic",
    label: "نوتو سنس",
    note: "ساده و تمیز، مناسب متن‌های طولانی",
    family: "'Noto Sans Arabic', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap",
  },
  {
    key: "noto-kufi",
    label: "نوتو کوفی",
    note: "هندسی و مدرن، برای ظاهری متفاوت",
    family: "'Noto Kufi Arabic', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap",
  },
  {
    key: "noto-naskh",
    label: "نسخ سنتی",
    note: "کلاسیک و رسمی، حال‌وهوای کتابی",
    family: "'Noto Naskh Arabic', serif",
    url: "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap",
  },
  {
    key: "markazi",
    label: "مرکزی",
    note: "ظریف و کشیده، مناسب تیترها",
    family: "'Markazi Text', serif",
    url: "https://fonts.googleapis.com/css2?family=Markazi+Text:wght@400;500;600;700&display=swap",
  },
];

export const DEFAULT_FONT: FontOption = FONT_OPTIONS[0];

// Never throws — an unknown/legacy key falls back to the default font.
export function getFont(key?: string | null): FontOption {
  if (!key) return DEFAULT_FONT;
  return FONT_OPTIONS.find((f) => f.key === key) ?? DEFAULT_FONT;
}
