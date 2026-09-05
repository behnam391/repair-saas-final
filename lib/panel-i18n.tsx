"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PanelLocale = "fa" | "en" | "ar";

const labels: Record<PanelLocale, Record<string, string>> = {
  fa: {},
  en: {
    "پنل مشتری": "Customer panel", "خوش آمدید،": "Welcome,", "مغازه‌ها": "Repair shops",
    "تعمیرهای من": "My repairs", "امتیازهای من": "My ratings", "امتیازها": "Ratings", "پروفایل": "Profile",
    "منو": "Menu", "خروج": "Sign out", "خروج از حساب": "Sign out", "ناوبری اصلی": "Main navigation",
    "کار روزانه": "Daily work", "داشبورد": "Dashboard", "پذیرش موبایل": "Mobile intake",
    "پذیرش کامپیوتر": "Computer intake", "تعمیرات و سوابق": "Repairs & history", "مشتریان": "Customers",
    "عملیات": "Operations", "انبار و قطعات": "Inventory & parts", "انبار قطعات": "Parts inventory",
    "فاکتورها": "Invoices", "امور مالی": "Finance", "خرید و فروش": "Buy & sell", "ارتباط و مدیریت": "Communication & management",
    "همکاری تعمیرگاه‌ها": "Repair shop network", "همکاری مغازه‌ها": "Shop collaboration", "پیام‌ها": "Messages",
    "پشتیبانی": "Support", "پروفایل و حساب من": "My profile & account", "گزارش‌ها": "Reports",
    "تنظیمات تعمیرگاه": "Shop settings", "باز کردن منو": "Open menu", "جمع کردن منو": "Collapse menu",
    "باز کردن منوی داشبورد": "Open dashboard menu", "جمع کردن منوی داشبورد": "Collapse dashboard menu",
    "داشبورد پیوو": "Peyvo dashboard", "مدیر": "Manager", "پذیرش": "Front desk", "سخت‌افزار": "Hardware",
    "نرم‌افزار": "Software", "تخصصی": "Specialist", "صفحه اصلی": "Home", "خانه": "Home", "تعمیرها": "Repairs",
    "بازار": "Market", "پرونده": "Device file", "انبار": "Inventory", "اشتراک": "Subscription",
    "فروش مستقیم": "Direct sales", "مرجوعی": "Returns", "پذیرش QR": "QR intake", "ارتباطات": "Communications",
    "بازار سراسری": "Marketplace", "چت‌ها": "Chats", "پرونده گوشی": "Device record", "دفترچه همکاران": "Partner directory",
    "دفترچه مشتریان": "Customer directory", "سابقه و جستجو": "History & search", "من": "My account",
    "پروفایل من": "My profile", "راهنمای سایت": "Help center", "درباره ما": "About us", "مدیریت": "Management",
    "دخل و خرج": "Income & expenses", "اشتراک و پرداخت": "Subscription & billing", "کیف پول": "Wallet",
    "شبکه تعمیرگاه‌های پیوو": "Peyvo repair network", "تعمیرگاه مناسب را با اطمینان پیدا کنید": "Find a trusted repair shop",
    "همه تعمیرگاه‌های فعال را ببینید، بر اساس شهر یا فاصله جستجو کنید و تجربه مشتریان را مقایسه کنید.": "Browse active repair shops, search by city or distance, and compare customer experiences.",
    "مرکز قابل مشاهده": "Available centers", "پوشش اولیه": "Initial coverage", "جستجوی تعمیرگاه": "Search repair shops",
    "بدون انتخاب فیلتر، همه مراکز فعال نمایش داده می‌شوند": "All active centers are shown when no filter is selected",
    "پاک کردن فیلترها": "Clear filters", "همه استان‌ها": "All provinces", "همه شهرها": "All cities",
    "جستجوی نام مغازه...": "Search shop name...", "جستجو": "Search", "نزدیک‌ترین تعمیرگاه‌ها به من": "Repair shops near me",
    "فهرست": "List", "نقشه": "Map", "ثبت امتیاز": "Submit rating", "تماس": "Call", "مسیریابی": "Directions",
    "تعمیرهای ثبت‌شده من": "My registered repairs", "هنوز تعمیری ثبت نشده است": "No repairs have been registered yet",
    "پروفایل مشتری": "Customer profile", "ذخیره تغییرات": "Save changes", "نام و نام خانوادگی": "Full name",
    "شماره موبایل": "Mobile number", "کد ملی": "National ID", "اطلاعات حساب": "Account information",
    "در حال بارگذاری...": "Loading...", "دوباره تلاش کنید": "Try again", "لغو": "Cancel", "ذخیره": "Save",
    "بستن": "Close", "تأیید": "Confirm", "در حال ثبت...": "Saving...", "مشاهده جزئیات": "View details",
    "داشبورد روزانه": "Daily dashboard", "نبض هوشمند امروز": "Today's smart pulse", "میانبرهای سریع": "Quick actions",
    "درآمد امروز": "Today's revenue", "آماده تحویل": "Ready for delivery", "در انتظار تأیید": "Awaiting approval",
    "تعمیرات فعال": "Active repairs", "نمای عملکرد تعمیرگاه": "Shop performance", "پذیرش جدید": "New intake",
    "فاکتور جدید": "New invoice", "مشتری جدید": "New customer", "ورود قطعه": "Stock entry",
    "در صف بررسی": "Queued for review", "در حال تعمیر": "Under repair", "منتظر تأیید هزینه": "Awaiting cost approval",
    "ارجاع به بخش دیگر": "Transferred to another section", "آماده تحویل ✅": "Ready for delivery ✅", "تحویل شده": "Delivered", "لغو شده": "Cancelled",
    "کل دستگاه‌ها": "All devices", "پرونده ثبت‌شده": "Registered records", "جستجوی مدل گوشی، نام مشتری یا شماره تیکت...": "Search device model, customer or ticket number...",
    "پاک کردن": "Clear", "جمع کردن": "Collapse", "نمایش عملکرد": "Show performance", "هنوز تعمیر فعالی ثبت نشده است": "No active repairs yet",
    "تخصیص‌نیافته": "Unassigned", "دستگاه": "Device", "تعمیرکار": "Technician", "وضعیت": "Status", "تاریخ پذیرش": "Intake date",
    "منبع دریافت دستگاه": "Device source", "اطلاعات مشتری": "Customer information", "مشخصات موبایل": "Mobile details",
    "پرونده فنی کامپیوتر": "Computer technical file", "شرح ایراد": "Issue description", "ثبت پذیرش": "Register intake",
    "اطلاعات را مرحله‌به‌مرحله ثبت کنید": "Enter the information step by step", "فرم تخصصی تجهیزات رایانه‌ای": "Computer equipment intake form",
    "برند، مدل و شناسه دستگاه": "Device brand, model and identifier", "نوع سیستم، سازنده، سیستم‌عامل و متعلقات": "System type, manufacturer, operating system and accessories",
    "نامشخص": "Unknown", "بدون لوازم": "No accessories", "نمایش رمز": "Show password", "به مشتری": "To customer",
    "مانده حساب": "Outstanding balance", "تأیید تحویل": "Confirm delivery", "دلیل انصراف (اختیاری)": "Cancellation reason (optional)",
    "کامپیوتر": "Computer", "موبایل": "Mobile", "رایانه": "Computer", "ایراد": "Issue",
    "نظر شما (اختیاری)...": "Your review (optional)...", "نظر شما درباره این مغازه (اختیاری)...": "Your review of this shop (optional)...",
  },
  ar: {
    "پنل مشتری": "لوحة العميل", "خوش آمدید،": "مرحباً،", "مغازه‌ها": "مراكز الصيانة",
    "تعمیرهای من": "إصلاحاتي", "امتیازهای من": "تقييماتي", "امتیازها": "التقييمات", "پروفایل": "الملف الشخصي",
    "منو": "القائمة", "خروج": "تسجيل الخروج", "خروج از حساب": "تسجيل الخروج", "ناوبری اصلی": "التنقل الرئيسي",
    "کار روزانه": "العمل اليومي", "داشبورد": "لوحة التحكم", "پذیرش موبایل": "استلام هاتف",
    "پذیرش کامپیوتر": "استلام كمبيوتر", "تعمیرات و سوابق": "الإصلاحات والسجل", "مشتریان": "العملاء",
    "عملیات": "العمليات", "انبار و قطعات": "المخزون والقطع", "انبار قطعات": "مخزون القطع", "فاکتورها": "الفواتير",
    "امور مالی": "المالية", "خرید و فروش": "البيع والشراء", "ارتباط و مدیریت": "التواصل والإدارة",
    "همکاری تعمیرگاه‌ها": "شبكة مراكز الصيانة", "همکاری مغازه‌ها": "تعاون المراكز", "پیام‌ها": "الرسائل",
    "پشتیبانی": "الدعم", "پروفایل و حساب من": "ملفي وحسابي", "گزارش‌ها": "التقارير", "تنظیمات تعمیرگاه": "إعدادات المركز",
    "باز کردن منو": "فتح القائمة", "جمع کردن منو": "طي القائمة", "داشبورد پیوو": "لوحة Peyvo", "مدیر": "مدير",
    "پذیرش": "الاستقبال", "سخت‌افزار": "الأجهزة", "نرم‌افزار": "البرمجيات", "تخصصی": "متخصص",
    "صفحه اصلی": "الرئيسية", "خانه": "الرئيسية", "تعمیرها": "الإصلاحات", "بازار": "السوق", "پرونده": "ملف الجهاز",
    "انبار": "المخزون", "اشتراک": "الاشتراك", "فروش مستقیم": "البيع المباشر", "مرجوعی": "المرتجعات",
    "پذیرش QR": "استلام QR", "ارتباطات": "التواصل", "بازار سراسری": "السوق", "چت‌ها": "المحادثات",
    "پرونده گوشی": "سجل الجهاز", "دفترچه همکاران": "دليل الشركاء", "دفترچه مشتریان": "دليل العملاء",
    "سابقه و جستجو": "السجل والبحث", "من": "حسابي", "پروفایل من": "ملفي", "راهنمای سایت": "مركز المساعدة",
    "درباره ما": "من نحن", "مدیریت": "الإدارة", "دخل و خرج": "الإيرادات والمصروفات", "اشتراک و پرداخت": "الاشتراك والدفع", "کیف پول": "المحفظة",
    "شبکه تعمیرگاه‌های پیوو": "شبكة مراكز صيانة Peyvo", "تعمیرگاه مناسب را با اطمینان پیدا کنید": "اعثر على مركز صيانة موثوق",
    "همه تعمیرگاه‌های فعال را ببینید، بر اساس شهر یا فاصله جستجو کنید و تجربه مشتریان را مقایسه کنید.": "تصفح المراكز النشطة وابحث حسب المدينة أو المسافة وقارن تجارب العملاء.",
    "مرکز قابل مشاهده": "مراكز متاحة", "پوشش اولیه": "التغطية الأولية", "جستجوی تعمیرگاه": "البحث عن مركز",
    "بدون انتخاب فیلتر، همه مراکز فعال نمایش داده می‌شوند": "تظهر جميع المراكز النشطة عند عدم اختيار مرشح", "پاک کردن فیلترها": "مسح المرشحات",
    "همه استان‌ها": "جميع المحافظات", "همه شهرها": "جميع المدن", "جستجوی نام مغازه...": "ابحث باسم المركز...",
    "جستجو": "بحث", "نزدیک‌ترین تعمیرگاه‌ها به من": "أقرب مراكز الصيانة", "فهرست": "القائمة", "نقشه": "الخريطة",
    "ثبت امتیاز": "إرسال التقييم", "تماس": "اتصال", "مسیریابی": "الاتجاهات", "تعمیرهای ثبت‌شده من": "إصلاحاتي المسجلة",
    "هنوز تعمیری ثبت نشده است": "لم يتم تسجيل أي إصلاح بعد", "پروفایل مشتری": "ملف العميل", "ذخیره تغییرات": "حفظ التغييرات",
    "نام و نام خانوادگی": "الاسم الكامل", "شماره موبایل": "رقم الهاتف", "کد ملی": "رقم الهوية", "اطلاعات حساب": "معلومات الحساب",
    "در حال بارگذاری...": "جارٍ التحميل...", "دوباره تلاش کنید": "حاول مرة أخرى", "لغو": "إلغاء", "ذخیره": "حفظ",
    "بستن": "إغلاق", "تأیید": "تأكيد", "در حال ثبت...": "جارٍ الحفظ...", "مشاهده جزئیات": "عرض التفاصيل",
    "داشبورد روزانه": "لوحة اليوم", "نبض هوشمند امروز": "المؤشرات الذكية اليوم", "میانبرهای سریع": "إجراءات سريعة",
    "درآمد امروز": "إيراد اليوم", "آماده تحویل": "جاهز للتسليم", "در انتظار تأیید": "بانتظار التأكيد",
    "تعمیرات فعال": "الإصلاحات النشطة", "نمای عملکرد تعمیرگاه": "أداء مركز الصيانة", "پذیرش جدید": "استلام جديد",
    "فاکتور جدید": "فاتورة جديدة", "مشتری جدید": "عميل جديد", "ورود قطعه": "إضافة قطعة",
    "در صف بررسی": "في قائمة المراجعة", "در حال تعمیر": "قيد الإصلاح", "منتظر تأیید هزینه": "بانتظار اعتماد التكلفة",
    "ارجاع به بخش دیگر": "محال إلى قسم آخر", "آماده تحویل ✅": "جاهز للتسليم ✅", "تحویل شده": "تم التسليم", "لغو شده": "ملغي",
    "کل دستگاه‌ها": "كل الأجهزة", "پرونده ثبت‌شده": "سجلات مسجلة", "جستجوی مدل گوشی، نام مشتری یا شماره تیکت...": "ابحث عن الجهاز أو العميل أو رقم التذكرة...",
    "پاک کردن": "مسح", "جمع کردن": "طي", "نمایش عملکرد": "عرض الأداء", "هنوز تعمیر فعالی ثبت نشده است": "لا توجد إصلاحات نشطة بعد",
    "تخصیص‌نیافته": "غير معين", "دستگاه": "الجهاز", "تعمیرکار": "الفني", "وضعیت": "الحالة", "تاریخ پذیرش": "تاريخ الاستلام",
    "منبع دریافت دستگاه": "مصدر الجهاز", "اطلاعات مشتری": "معلومات العميل", "مشخصات موبایل": "تفاصيل الهاتف",
    "پرونده فنی کامپیوتر": "الملف الفني للكمبيوتر", "شرح ایراد": "وصف العطل", "ثبت پذیرش": "تسجيل الاستلام",
    "اطلاعات را مرحله‌به‌مرحله ثبت کنید": "أدخل المعلومات خطوة بخطوة", "فرم تخصصی تجهیزات رایانه‌ای": "نموذج استلام معدات الكمبيوتر",
    "برند، مدل و شناسه دستگاه": "العلامة والطراز ومعرّف الجهاز", "نوع سیستم، سازنده، سیستم‌عامل و متعلقات": "نوع النظام والشركة ونظام التشغيل والملحقات",
    "نامشخص": "غير معروف", "بدون لوازم": "بدون ملحقات", "نمایش رمز": "إظهار كلمة المرور", "به مشتری": "إلى العميل",
    "مانده حساب": "الرصيد المتبقي", "تأیید تحویل": "تأكيد التسليم", "دلیل انصراف (اختیاری)": "سبب الإلغاء (اختياري)",
    "کامپیوتر": "كمبيوتر", "موبایل": "هاتف", "رایانه": "كمبيوتر", "ایراد": "العطل",
    "نظر شما (اختیاری)...": "رأيك (اختياري)...", "نظر شما درباره این مغازه (اختیاری)...": "رأيك في هذا المركز (اختياري)...",
  },
};

type ContextValue = { locale: PanelLocale; setLocale: (locale: PanelLocale) => void; t: (text: string) => string; dir: "rtl" | "ltr" };
const PanelI18nContext = createContext<ContextValue>({ locale: "fa", setLocale: () => {}, t: (v) => v, dir: "rtl" });

function translateText(value: string, locale: PanelLocale) {
  if (locale === "fa" || !value.trim()) return value;
  const table = labels[locale];
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim();
  if (table[core]) return `${leading}${table[core]}${trailing}`;
  for (const [source, target] of Object.entries(table)) {
    if (core.startsWith(`${source} `) || core.startsWith(`${source}،`)) {
      return `${leading}${core.replace(source, target)}${trailing}`;
    }
  }
  return value;
}

export function PanelI18nProvider({ children, initialLocale = "fa" }: { children: React.ReactNode; initialLocale?: PanelLocale }) {
  const [locale, setLocaleState] = useState<PanelLocale>(initialLocale);
  const setLocale = (next: PanelLocale) => {
    try {
      localStorage.setItem("peyvo-panel-locale", next);
      document.cookie = `peyvo_panel_locale=${next}; max-age=31536000; path=/; samesite=lax`;
    } catch {}
    setLocaleState(next);
    window.setTimeout(() => window.location.reload(), 20);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("peyvo-panel-locale") as PanelLocale | null;
      if (saved === "fa" || saved === "en" || saved === "ar") setLocaleState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
    document.documentElement.dataset.panelLocale = locale;
  }, [locale]);

  useEffect(() => {
    if (locale === "fa") return;
    const translateElement = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) continue;
        const next = translateText(node.textContent ?? "", locale);
        if (next !== node.textContent) node.textContent = next;
      }
      root.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach((element) => {
        for (const attribute of ["placeholder", "title", "aria-label"]) {
          const current = element.getAttribute(attribute);
          if (current) element.setAttribute(attribute, translateText(current, locale));
        }
      });
    };
    translateElement(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const next = translateText(node.textContent ?? "", locale);
            if (next !== node.textContent) node.textContent = next;
          } else if (node instanceof HTMLElement) translateElement(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<ContextValue>(() => ({ locale, setLocale, t: (text) => translateText(text, locale), dir: locale === "en" ? "ltr" : "rtl" }), [locale]);
  return <PanelI18nContext.Provider value={value}>{children}</PanelI18nContext.Provider>;
}

export const usePanelI18n = () => useContext(PanelI18nContext);
