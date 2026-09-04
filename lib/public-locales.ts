import type { PublicLocale } from "./public-locale-core";

export {
  PUBLIC_LOCALES,
  getPublicLocale,
  publicPath,
  PUBLIC_LANGUAGE_LABELS,
  type PublicLocale,
} from "./public-locale-core";

export type HomeFeatureCopy = {
  title: string;
  text: string;
};

export type HomeCopy = {
  locale: PublicLocale;
  dir: "rtl" | "ltr";
  seo: { title: string; description: string };
  nav: {
    home: string; aria: string; product: string; features: string; workflow: string;
    trust: string; login: string; download: string; language: string;
  };
  hero: {
    online: string; audience: string; brand: string; title: string; description: string;
    start: string; customerLogin: string; free: string; fast: string; support: string;
    installAria: string; version: string; direct: string;
  };
  store: {
    pending: string; getFrom: string; underReviewAria: string; officialLogo: string;
    viewOfficial: string; officialPage: string; officialPublication: string;
  };
  ai: {
    visualAria: string; mascotAlt: string; liveStatus: string; today: string;
    reception: string; repairing: string; ready: string; assistant: string;
    importantToday: string; caption: string;
  };
  proof: {
    version: string; operational: string; verified: string; platforms: string;
    completeCycle: string; support: string; aria: string;
  };
  capabilities: { kicker: string; title: string; description: string; features: HomeFeatureCopy[] };
  intelligence: {
    kicker: string; title: string; accent: string; description: string;
    bottleneck: string; inventory: string; finance: string;
  };
  workflow: { kicker: string; title: string; steps: Array<{ n: string; title: string; text: string }> };
  trust: {
    kicker: string; title: string; description: string; domain: string; identity: string;
    app: string; enamad: string; enamadSub: string; zarinpal: string; zarinpalSub: string;
    bazaarPublished: string; myketPublished: string;
  };
  final: { kicker: string; titleLine1: string; titleLine2: string; description: string; account: string; download: string };
  footer: {
    tagline: string; online: string; product: string; features: string; workflow: string;
    download: string; access: string; shopLogin: string; customerLogin: string; signup: string;
    supportAndLegal: string; support: string; terms: string; privacy: string;
    verified: string; copyright: string; madeFor: string;
  };
};

export const HOME_COPY: Record<PublicLocale, HomeCopy> = {
  fa: {
    locale: "fa", dir: "rtl",
    seo: {
      title: "پیوو | سامانه هوشمند مدیریت تعمیرگاه",
      description: "پیوو، سامانه یکپارچه مدیریت تعمیرگاه برای پذیرش، تعمیر، مشتریان، انبار، امور مالی و همکاری بین تعمیرگاه‌ها.",
    },
    nav: { home: "صفحه اصلی پیوو", aria: "ناوبری اصلی", product: "محصول", features: "امکانات", workflow: "نحوه کار", trust: "اعتماد و مجوزها", login: "ورود به پنل", download: "دانلود برنامه", language: "انتخاب زبان" },
    hero: { online: "سامانه فعال و آنلاین", audience: "ساخته‌شده برای تعمیرگاه‌های ایران", brand: "پیوو؛", title: "مدیریت هوشمند تعمیرگاه", description: "از پذیرش دستگاه تا تعمیر، اطلاع‌رسانی، تحویل و تسویه؛ همه‌چیز را ساده، یکپارچه و مطمئن مدیریت کنید.", start: "شروع رایگان", customerLogin: "ورود مشتریان", free: "شروع بدون هزینه", fast: "راه‌اندازی سریع", support: "پشتیبانی فارسی", installAria: "روش‌های دریافت اپلیکیشن پیوو", version: "نسخه", direct: "دانلود مستقیم" },
    store: { pending: "در حال بررسی و انتشار", getFrom: "دریافت از", underReviewAria: "در حال بررسی", officialLogo: "لوگوی رسمی", viewOfficial: "مشاهده صفحه رسمی پیوو", officialPage: "مشاهده صفحه رسمی پیوو", officialPublication: "انتشار رسمی" },
    ai: { visualAria: "دستیار هوشمند پیوو و نمای گردش کار تعمیرگاه", mascotAlt: "کاراکتر دستیار هوشمند پیوو", liveStatus: "وضعیت زنده تعمیرگاه", today: "امروز", reception: "پذیرش", repairing: "در حال تعمیر", ready: "آماده تحویل", assistant: "دستیار هوشمند پیوو", importantToday: "کارهای مهم امروز را یک‌جا ببینید", caption: "دستیار هوشمند، همراه کارهای روزانه" },
    proof: { version: "نسخه عملیاتی", operational: "سامانه آماده استفاده و در حال توسعه مستمر", verified: "هویت و پرداخت قابل استعلام", platforms: "دسترسی وب و اندروید", completeCycle: "چرخه کامل پذیرش تا تحویل", support: "پشتیبانی فارسی", aria: "مزیت‌های پیوو" },
    capabilities: {
      kicker: "همه‌چیز در یک جریان", title: "نظم حرفه‌ای، بدون پیچیدگی.", description: "هر ابزاری که برای اداره یک تعمیرگاه مدرن لازم دارید؛ دقیقاً جایی که باید باشد.",
      features: [
        { title: "گردش‌کار تعمیرات", text: "از پذیرش و عیب‌یابی تا تخصیص، ثبت قطعه و تحویل؛ یک مسیر روشن و بدون دوباره‌کاری." },
        { title: "ارتباط هوشمند", text: "اطلاع‌رسانی وضعیت و پیگیری مشتری بدون تماس‌های تکراری." },
        { title: "دید مالی واقعی", text: "درآمد، هزینه، دستمزد و سود هر تعمیر در یک نگاه." },
        { title: "انبار دقیق", text: "کنترل موجودی، مصرف قطعه و هشدار کمبود پیش از توقف کار." },
        { title: "پذیرش با QR", text: "ورود سریع اطلاعات دستگاه و تجربه حرفه‌ای از همان لحظه اول." },
        { title: "همکاری بین تعمیرگاه‌ها", text: "ارجاع تخصصی، ثبت مسیر ارسال و تسویه شفاف با همکاران مورد اعتماد." },
      ],
    },
    intelligence: { kicker: "هوشمندی کاربردی، نه نمایشی", title: "اطلاعات را ثبت نکنید؛", accent: "از آن تصمیم بسازید.", description: "پیوو جریان روزانه تعمیرگاه را به نشانه‌های ساده و قابل اقدام تبدیل می‌کند؛ بدانید چه چیزی عقب افتاده، کدام قطعه رو به اتمام است و امروز کجا باید تمرکز کنید.", bottleneck: "تشخیص گلوگاه", inventory: "هشدار موجودی", finance: "دید مالی" },
    workflow: { kicker: "شروع ساده", title: "سه قدم تا یک تعمیرگاه منظم", steps: [{ n: "۰۱", title: "راه‌اندازی", text: "تعمیرگاه، خدمات و تیم را تعریف کنید." }, { n: "۰۲", title: "اجرای روزانه", text: "پذیرش، تعمیر و ارتباط با مشتری را یکپارچه کنید." }, { n: "۰۳", title: "رشد آگاهانه", text: "با گزارش‌های روشن، تصمیم دقیق‌تری بگیرید." }] },
    trust: { kicker: "هویت، پرداخت و انتشار رسمی", title: "اعتمادی که قابل استعلام است.", description: "هویت و دامنه پیوو در سامانه رسمی اینماد بررسی شده، پرداخت‌های وب از مسیر امن زرین‌پال انجام می‌شود و نسخه اندروید از کانال‌های معتبر فروشگاهی در دسترس قرار می‌گیرد.", domain: "دامنه ثبت‌شده", identity: "هویت تأییدشده", app: "انتشار رسمی اپلیکیشن", enamad: "نماد اعتماد الکترونیکی", enamadSub: "استعلام از سامانه رسمی", zarinpal: "درگاه پرداخت زرین‌پال", zarinpalSub: "پرداخت امن برای همین دامنه", bazaarPublished: "انتشار رسمی کافه‌بازار", myketPublished: "انتشار رسمی مایکت" },
    final: { kicker: "آماده یک شروع حرفه‌ای هستید؟", titleLine1: "سامانه مدیریت تعمیرگاه شما،", titleLine2: "همین حالا آماده است.", description: "رایگان شروع کنید و پیوو را با جریان واقعی تعمیرگاه خودتان بسنجید.", account: "ساخت حساب رایگان", download: "دانلود برنامه" },
    footer: { tagline: "زیرساخت یکپارچه مدیریت تعمیرگاه؛ دقیق، سریع و قابل اعتماد.", online: "سامانه فعال", product: "محصول", features: "امکانات", workflow: "نحوه کار", download: "دانلود برنامه", access: "دسترسی", shopLogin: "ورود تعمیرگاه", customerLogin: "ورود مشتری", signup: "ثبت‌نام رایگان", supportAndLegal: "پشتیبانی و قوانین", support: "پشتیبانی", terms: "شرایط استفاده", privacy: "حریم خصوصی", verified: "هویت کسب‌وکار تأیید شده", copyright: "© ۱۴۰۵ پیوو؛ تمامی حقوق محفوظ است.", madeFor: "ساخته‌شده برای تعمیرکاران ایران" },
  },
  en: {
    locale: "en", dir: "ltr",
    seo: {
      title: "Peyvo | Smart Repair Business Management",
      description: "Peyvo is an integrated platform for repair intake, workflow, customers, inventory, finance and collaboration between repair businesses.",
    },
    nav: { home: "Peyvo home", aria: "Main navigation", product: "Product", features: "Features", workflow: "How it works", trust: "Trust & compliance", login: "Sign in", download: "Get the app", language: "Choose language" },
    hero: { online: "Live and operational", audience: "Built for modern repair businesses", brand: "Peyvo;", title: "smarter repair-shop management", description: "Manage every step—from device intake and repair to customer updates, delivery and payment—in one simple, connected and reliable workspace.", start: "Start for free", customerLogin: "Customer sign in", free: "Free to start", fast: "Fast setup", support: "Dedicated support", installAria: "Ways to get the Peyvo app", version: "Version", direct: "Direct download" },
    store: { pending: "Under review and publishing", getFrom: "Get it from", underReviewAria: "under review", officialLogo: "Official logo of", viewOfficial: "View Peyvo's official page", officialPage: "View Peyvo's official page", officialPublication: "Official release" },
    ai: { visualAria: "Peyvo intelligent assistant and repair workflow preview", mascotAlt: "Peyvo intelligent assistant character", liveStatus: "Live workshop status", today: "Today", reception: "Intake", repairing: "In repair", ready: "Ready", assistant: "Peyvo intelligent assistant", importantToday: "See today's priorities in one place", caption: "An intelligent assistant for daily operations" },
    proof: { version: "Production version", operational: "Ready to use and continuously improved", verified: "Verifiable identity and payments", platforms: "Web and Android access", completeCycle: "Complete intake-to-delivery workflow", support: "Dedicated support", aria: "Peyvo advantages" },
    capabilities: {
      kicker: "Everything in one workflow", title: "Professional control, without the complexity.", description: "Every tool a modern repair business needs—placed exactly where your team expects it.",
      features: [
        { title: "Repair workflow", text: "A clear path from intake and assessment to assignment, parts usage and delivery—with no duplicate work." },
        { title: "Smart communication", text: "Keep customers informed and follow up without repetitive phone calls." },
        { title: "True financial visibility", text: "See revenue, expenses, payroll and profit for every repair at a glance." },
        { title: "Accurate inventory", text: "Track stock and parts consumption, with low-inventory alerts before work stops." },
        { title: "QR intake", text: "Capture device details quickly and create a professional experience from the first moment." },
        { title: "Business collaboration", text: "Refer specialist jobs, track handoffs and settle transparently with trusted partners." },
      ],
    },
    intelligence: { kicker: "Practical intelligence, not decoration", title: "Do more than record data;", accent: "turn it into decisions.", description: "Peyvo turns daily repair operations into clear, actionable signals. Know what is delayed, which part is running low, and where your team should focus today.", bottleneck: "Bottleneck detection", inventory: "Inventory alerts", finance: "Financial visibility" },
    workflow: { kicker: "Simple onboarding", title: "Three steps to an organised repair business", steps: [{ n: "01", title: "Set up", text: "Define your business, services and team." }, { n: "02", title: "Run daily operations", text: "Connect intake, repair and customer communication." }, { n: "03", title: "Grow with clarity", text: "Make better decisions with clear reports." }] },
    trust: { kicker: "Verified identity, payments and distribution", title: "Trust that can be verified.", description: "Peyvo's business identity and domain are registered and verifiable. Web payments use a secure licensed gateway, and the Android app is distributed through recognised app stores.", domain: "Registered domain", identity: "Verified business identity", app: "Official app distribution", enamad: "Electronic Trust Seal", enamadSub: "Verify on the official registry", zarinpal: "Zarinpal payment gateway", zarinpalSub: "Secure payment for this domain", bazaarPublished: "Official Cafe Bazaar release", myketPublished: "Official Myket release" },
    final: { kicker: "Ready for a more professional workflow?", titleLine1: "Your repair management platform", titleLine2: "is ready to go.", description: "Start for free and test Peyvo with your real daily workflow.", account: "Create a free account", download: "Get the app" },
    footer: { tagline: "An integrated repair-management platform—accurate, fast and dependable.", online: "Service operational", product: "Product", features: "Features", workflow: "How it works", download: "Get the app", access: "Access", shopLogin: "Repair business sign in", customerLogin: "Customer sign in", signup: "Create free account", supportAndLegal: "Support & legal", support: "Support", terms: "Terms of use", privacy: "Privacy policy", verified: "Verified business identity", copyright: "© 2026 Peyvo. All rights reserved.", madeFor: "Built for modern repair professionals" },
  },
  ar: {
    locale: "ar", dir: "rtl",
    seo: {
      title: "Peyvo | الإدارة الذكية لمراكز الصيانة",
      description: "Peyvo منصة متكاملة لإدارة الاستلام والصيانة والعملاء والمخزون والمالية والتعاون بين مراكز الصيانة.",
    },
    nav: { home: "الصفحة الرئيسية لـ Peyvo", aria: "التنقل الرئيسي", product: "المنتج", features: "المزايا", workflow: "آلية العمل", trust: "الثقة والتراخيص", login: "تسجيل الدخول", download: "تحميل التطبيق", language: "اختيار اللغة" },
    hero: { online: "منصة فعّالة ومتاحة", audience: "مصممة لمراكز الصيانة الحديثة", brand: "Peyvo؛", title: "إدارة أذكى لمركز الصيانة", description: "أدِر كل شيء—من استلام الجهاز والصيانة إلى إبلاغ العميل والتسليم والتسوية—ضمن مساحة عمل واحدة بسيطة ومتكاملة وموثوقة.", start: "ابدأ مجاناً", customerLogin: "دخول العملاء", free: "بدء بلا تكلفة", fast: "إعداد سريع", support: "دعم متخصّص", installAria: "طرق الحصول على تطبيق Peyvo", version: "الإصدار", direct: "تحميل مباشر" },
    store: { pending: "قيد المراجعة والنشر", getFrom: "حمّل من", underReviewAria: "قيد المراجعة", officialLogo: "الشعار الرسمي لـ", viewOfficial: "عرض صفحة Peyvo الرسمية", officialPage: "عرض صفحة Peyvo الرسمية", officialPublication: "إصدار رسمي" },
    ai: { visualAria: "مساعد Peyvo الذكي ومعاينة سير عمل مركز الصيانة", mascotAlt: "شخصية مساعد Peyvo الذكي", liveStatus: "حالة مركز الصيانة مباشرة", today: "اليوم", reception: "الاستلام", repairing: "قيد الصيانة", ready: "جاهز للتسليم", assistant: "مساعد Peyvo الذكي", importantToday: "شاهد أولويات اليوم في مكان واحد", caption: "مساعد ذكي يرافق أعمالك اليومية" },
    proof: { version: "الإصدار التشغيلي", operational: "جاهز للاستخدام ويتطور باستمرار", verified: "هوية ومدفوعات قابلة للتحقق", platforms: "الوصول عبر الويب وأندرويد", completeCycle: "دورة كاملة من الاستلام إلى التسليم", support: "دعم متخصّص", aria: "مزايا Peyvo" },
    capabilities: {
      kicker: "كل شيء ضمن سير عمل واحد", title: "تنظيم احترافي بلا تعقيد.", description: "كل أداة يحتاجها مركز الصيانة الحديث، في المكان الذي يتوقعه فريقك تماماً.",
      features: [
        { title: "سير عمل الصيانة", text: "مسار واضح من الاستلام والفحص إلى التعيين واستخدام القطع والتسليم، من دون تكرار العمل." },
        { title: "تواصل ذكي", text: "إبلاغ العملاء بالحالة ومتابعتهم من دون مكالمات متكررة." },
        { title: "رؤية مالية حقيقية", text: "الإيرادات والمصروفات والأجور وربح كل عملية صيانة في لمحة واحدة." },
        { title: "مخزون دقيق", text: "متابعة المخزون واستهلاك القطع والتنبيه قبل نفادها وتعطل العمل." },
        { title: "استلام عبر QR", text: "إدخال سريع لبيانات الجهاز وتجربة احترافية منذ اللحظة الأولى." },
        { title: "التعاون بين المراكز", text: "إحالة الأعمال التخصصية وتتبع التسليم والتسوية بشفافية مع الشركاء الموثوقين." },
      ],
    },
    intelligence: { kicker: "ذكاء عملي وليس استعراضياً", title: "لا تكتفِ بتسجيل البيانات؛", accent: "حوّلها إلى قرارات.", description: "يحوّل Peyvo العمل اليومي إلى مؤشرات واضحة وقابلة للتنفيذ؛ اعرف ما تأخر، وأي قطعة قاربت على النفاد، وأين يجب أن يركز فريقك اليوم.", bottleneck: "كشف الاختناقات", inventory: "تنبيهات المخزون", finance: "رؤية مالية" },
    workflow: { kicker: "انطلاقة بسيطة", title: "ثلاث خطوات نحو مركز صيانة منظّم", steps: [{ n: "01", title: "الإعداد", text: "عرّف مركزك وخدماتك وفريقك." }, { n: "02", title: "إدارة العمل اليومي", text: "اربط الاستلام والصيانة والتواصل مع العميل." }, { n: "03", title: "نمو بوضوح", text: "اتخذ قرارات أدق عبر تقارير واضحة." }] },
    trust: { kicker: "هوية ومدفوعات ونشر رسمي", title: "ثقة يمكن التحقق منها.", description: "هوية Peyvo التجارية ونطاقها مسجلان وقابلان للتحقق. تتم مدفوعات الويب عبر بوابة مرخّصة وآمنة، ويتوفر تطبيق أندرويد عبر متاجر تطبيقات معروفة.", domain: "نطاق مسجّل", identity: "هوية تجارية موثقة", app: "توزيع رسمي للتطبيق", enamad: "شارة الثقة الإلكترونية", enamadSub: "تحقق عبر السجل الرسمي", zarinpal: "بوابة دفع Zarinpal", zarinpalSub: "دفع آمن لهذا النطاق", bazaarPublished: "إصدار رسمي على Cafe Bazaar", myketPublished: "إصدار رسمي على Myket" },
    final: { kicker: "هل أنت مستعد لسير عمل أكثر احترافاً؟", titleLine1: "منصة إدارة مركز الصيانة", titleLine2: "جاهزة لك الآن.", description: "ابدأ مجاناً واختبر Peyvo ضمن سير عملك الحقيقي.", account: "إنشاء حساب مجاني", download: "تحميل التطبيق" },
    footer: { tagline: "منصة متكاملة لإدارة مراكز الصيانة؛ دقيقة وسريعة وموثوقة.", online: "الخدمة فعّالة", product: "المنتج", features: "المزايا", workflow: "آلية العمل", download: "تحميل التطبيق", access: "الدخول", shopLogin: "دخول مركز الصيانة", customerLogin: "دخول العميل", signup: "إنشاء حساب مجاني", supportAndLegal: "الدعم والقوانين", support: "الدعم", terms: "شروط الاستخدام", privacy: "سياسة الخصوصية", verified: "هوية تجارية موثقة", copyright: "© 2026 Peyvo. جميع الحقوق محفوظة.", madeFor: "مصمم لمتخصصي الصيانة الحديثة" },
  },
};
