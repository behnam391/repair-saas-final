import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";
import { getPublicLocale } from "@/lib/public-locales";

const CONTENT = {
  fa: {
    title: "سیاست حفظ حریم خصوصی", updated: "شهریور ۱۴۰۵",
    intro: "حفظ حریم خصوصی شما برای «پیوو» (Peyvo) اهمیت دارد. این سند توضیح می‌دهد چه اطلاعاتی جمع‌آوری می‌کنیم، چرا، و چگونه از آن‌ها مراقبت می‌کنیم.",
    sections: [
      ["۱) چه اطلاعاتی جمع‌آوری می‌کنیم", "برای ارائه سرویس، اطلاعاتی مانند نام، شماره موبایل، ایمیل (در صورت ثبت)، موقعیت و آدرس مغازه، و اطلاعات مربوط به دستگاه‌ها، تیکت‌های تعمیر و فاکتورها را ذخیره می‌کنیم. برای مشتریان، اطلاعات حساب و امتیازهای ثبت‌شده نگهداری می‌شود. برای امنیت حساب نیز زمان ورود و آخرین فعالیت، نشانی IP و مشخصات کلی مرورگر یا دستگاه ثبت می‌شود؛ رمز عبور، کوکی و توکن ورود در گزارش نشست‌ها ذخیره نمی‌شود."],
      ["۲) چرا این اطلاعات را جمع می‌کنیم", "این داده‌ها صرفاً برای ارائه و بهبود سرویس، اطلاع‌رسانی وضعیت تعمیر از طریق پیامک، پشتیبانی، و امکان جستجو و مدیریت سوابق استفاده می‌شوند."],
      ["۳) موقعیت مکانی و مخاطبین گوشی", "دسترسی به موقعیت مکانی اختیاری است و فقط پس از اجازه صریح شما، برای نمایش نقشه و مرتب‌سازی تعمیرگاه‌های نزدیک استفاده می‌شود؛ پیوو موقعیت شما را در پس‌زمینه ردیابی نمی‌کند. هنگام پذیرش دستگاه نیز تنها در صورت انتخاب شما، انتخاب‌گر استاندارد اندروید باز می‌شود و فقط نام و شماره همان مخاطبی که خودتان انتخاب کرده‌اید در فرم قرار می‌گیرد؛ برنامه دفترچه مخاطبین را به‌صورت کامل نمی‌خواند یا بارگذاری نمی‌کند."],
      ["۴) اطلاع‌رسانی پیامکی", "با ثبت‌نام و ثبت شماره موبایل، دریافت پیامک‌های مرتبط با سرویس، مانند کد تأیید، اطلاع پذیرش و آماده‌شدن دستگاه را می‌پذیرید. این پیامک‌ها بخشی از عملکرد سرویس هستند."],
      ["۵) اشتراک‌گذاری اطلاعات", "ما اطلاعات شخصی شما را نمی‌فروشیم. داده‌ها تنها با سرویس‌دهنده‌های لازم برای عملکرد سرویس، مانند سامانه پیامک، درگاه پرداخت و سرویس نقشه، در حد ضرورت یا در موارد الزام قانونی به اشتراک گذاشته می‌شوند."],
      ["۶) پرداخت‌ها", "خرید اشتراک در نسخه‌های فروشگاهی فقط از طریق پرداخت درون‌برنامه‌ای فروشگاه نصب‌کننده انجام می‌شود. برای تأیید و بازیابی خرید، شناسه محصول و رسید پرداخت میان همان فروشگاه و سرور پیوو مبادله می‌شود. پرداخت‌های مجاز نسخه وب از طریق درگاه بانکی انجام می‌شوند. پیوو شماره کارت یا رمز بانکی شما را دریافت یا ذخیره نمی‌کند."],
      ["۷) امنیت اطلاعات", "ما اقدامات معقول و متعارفی برای محافظت از داده‌های شما در برابر دسترسی غیرمجاز انجام می‌دهیم. نشست‌های فعال قابل مشاهده و ابطال توسط مدیر مجاز پلتفرم هستند و پس از تغییر رمز یا غیرفعال‌شدن حساب، نشست‌های قبلی بسته می‌شوند. با این حال هیچ سامانه‌ای صددرصد مصون نیست و باید در حفظ رمز عبور خود دقت کنید."],
      ["۸) حقوق شما", "شما می‌توانید اطلاعات حساب خود را مشاهده و ویرایش کنید و در هر زمان حساب کاربری‌تان را حذف نمایید. با حذف حساب، اطلاعات حساب و داده‌های عملیاتی وابسته پاک می‌شود؛ سوابق حداقلی امنیتی ممکن است برای جلوگیری از سوءاستفاده و رسیدگی به رخدادهای امنیتی، برای دوره موردنیاز نگهداری شوند."],
      ["۹) کوکی‌ها", "برای ورود به حساب و عملکرد صحیح سایت از کوکی‌های ضروری استفاده می‌شود. این کوکی‌ها برای نگه‌داشتن نشست ورود شما لازم‌اند."],
      ["۱۰) تماس با ما", "برای پرسش‌های مربوط به حریم خصوصی از بخش پشتیبانی داخل پنل یا ایمیل support@peyvo.ir استفاده کنید."],
    ],
  },
  en: {
    title: "Privacy Policy", updated: "September 2026",
    intro: "Your privacy matters to Peyvo. This policy explains what information we collect, why we use it and how we protect it.",
    sections: [
      ["1) Information we collect", "To provide the service, we may store names, mobile numbers, email addresses when supplied, business locations and addresses, and information related to devices, repair tickets and invoices. We also retain customer account data and ratings. For account security, login time, recent activity, IP address and general browser or device information may be recorded. Passwords, cookies and login tokens are never stored in session activity reports."],
      ["2) How we use information", "We use this data only to provide and improve Peyvo, communicate repair status, offer support, and enable authorised users to search and manage operational records."],
      ["3) Location and device contacts", "Location access is optional and is used only after your explicit permission to show maps or sort nearby repair businesses. Peyvo does not track location in the background. If you choose a contact during device intake, Android's standard contact picker supplies only the name and number you selected; Peyvo does not read or upload your full address book."],
      ["4) Service messages", "By registering a mobile number, you agree to receive essential service messages such as verification codes, intake confirmations and device-ready notifications. These messages are part of the service."],
      ["5) Sharing information", "We do not sell personal information. Data is shared only with providers required to operate the service—such as messaging, payment and mapping services—on a need-to-know basis, or where disclosure is required by law."],
      ["6) Payments", "In app-store versions, subscriptions are purchased only through the billing system of the store that distributed the app. Product identifiers and payment receipts are exchanged with that store to verify or restore a purchase. Authorised web payments use a licensed payment gateway. Peyvo never receives or stores your bank-card number or banking password."],
      ["7) Security", "We use reasonable safeguards to protect data against unauthorised access. Authorised platform administrators can review and revoke active sessions, and earlier sessions are closed after a password change or account suspension. No system is completely secure, so you remain responsible for protecting your password."],
      ["8) Your rights", "You can view and update your account information and request account deletion. Deleting an account removes its profile and related operational data. Minimal security records may be retained for the period reasonably required to prevent abuse and investigate security incidents."],
      ["9) Cookies", "Peyvo uses essential cookies to authenticate users and keep signed-in sessions working. These cookies are required for the service to function."],
      ["10) Contact", "For privacy questions, use support inside the platform or email support@peyvo.ir."],
    ],
  },
  ar: {
    title: "سياسة الخصوصية", updated: "سبتمبر 2026",
    intro: "خصوصيتك مهمة لدى Peyvo. توضح هذه السياسة المعلومات التي نجمعها، وأسباب استخدامها، وكيفية حمايتها.",
    sections: [
      ["1) المعلومات التي نجمعها", "لتقديم الخدمة قد نخزّن الاسم ورقم الهاتف والبريد الإلكتروني عند إدخاله، وموقع وعنوان النشاط، والمعلومات المتعلقة بالأجهزة وطلبات الصيانة والفواتير. كما نحتفظ ببيانات حسابات العملاء وتقييماتهم. ولأمن الحساب قد نسجّل وقت الدخول وآخر نشاط وعنوان IP والمعلومات العامة عن المتصفح أو الجهاز، من دون تخزين كلمات المرور أو ملفات تعريف الارتباط أو رموز الدخول في تقارير الجلسات."],
      ["2) كيفية استخدام المعلومات", "نستخدم هذه البيانات لتقديم Peyvo وتحسينه، وإرسال تحديثات حالة الصيانة، وتوفير الدعم، وتمكين المستخدمين المصرح لهم من البحث في السجلات التشغيلية وإدارتها."],
      ["3) الموقع وجهات اتصال الجهاز", "الوصول إلى الموقع اختياري ولا يتم إلا بعد موافقتك الصريحة لعرض الخريطة أو ترتيب مراكز الصيانة القريبة. لا يتتبع Peyvo موقعك في الخلفية. وعند اختيار جهة اتصال أثناء الاستلام، يزوّدنا منتقي أندرويد القياسي بالاسم والرقم اللذين اخترتهما فقط؛ ولا يقرأ Peyvo دفتر العناوين كاملاً أو يرفعه."],
      ["4) رسائل الخدمة", "بتسجيل رقم الهاتف توافق على تلقي الرسائل الضرورية للخدمة، مثل رموز التحقق وتأكيد الاستلام وإشعار جاهزية الجهاز. هذه الرسائل جزء من تشغيل الخدمة."],
      ["5) مشاركة المعلومات", "لا نبيع معلوماتك الشخصية. لا تتم مشاركة البيانات إلا مع الجهات اللازمة لتشغيل الخدمة، مثل خدمات الرسائل والدفع والخرائط، وبالقدر الضروري، أو عندما يفرض القانون الإفصاح عنها."],
      ["6) المدفوعات", "في نسخ متاجر التطبيقات، يتم شراء الاشتراك حصراً عبر نظام الدفع الخاص بالمتجر الذي وزّع التطبيق. تُتبادل معرّفات المنتجات وإيصالات الدفع مع المتجر للتحقق من الشراء أو استعادته. أما مدفوعات الويب المسموح بها فتتم عبر بوابة دفع مرخّصة. لا يستلم Peyvo رقم بطاقتك المصرفية أو كلمة المرور البنكية ولا يخزنهما."],
      ["7) أمن المعلومات", "نستخدم إجراءات معقولة لحماية البيانات من الوصول غير المصرح به. يستطيع مديرو المنصة المصرح لهم مراجعة الجلسات الفعالة وإلغائها، وتُغلق الجلسات السابقة بعد تغيير كلمة المرور أو تعليق الحساب. ومع ذلك لا يوجد نظام آمن بنسبة مئة في المئة، وتبقى مسؤولاً عن حماية كلمة مرورك."],
      ["8) حقوقك", "يمكنك عرض معلومات حسابك وتحديثها وطلب حذف الحساب. يؤدي الحذف إلى إزالة الملف والبيانات التشغيلية المرتبطة به. وقد نحتفظ بحد أدنى من سجلات الأمان للفترة اللازمة بصورة معقولة لمنع إساءة الاستخدام والتحقيق في الحوادث الأمنية."],
      ["9) ملفات تعريف الارتباط", "يستخدم Peyvo ملفات تعريف ارتباط ضرورية لتسجيل الدخول واستمرار الجلسة. هذه الملفات لازمة لعمل الخدمة."],
      ["10) التواصل معنا", "للاستفسارات المتعلقة بالخصوصية استخدم قسم الدعم داخل المنصة أو راسل support@peyvo.ir."],
    ],
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams?: { lang?: string | string[] } }): Metadata {
  const locale = getPublicLocale(searchParams?.lang);
  return { title: `${CONTENT[locale].title} | Peyvo` };
}

export default function PrivacyPage({ searchParams }: { searchParams?: { lang?: string | string[] } }) {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = CONTENT[locale];
  return (
    <LegalShell title={copy.title} updated={copy.updated} locale={locale} pagePath="/privacy">
      <p className="text-muted">{copy.intro}</p>
      {copy.sections.map(([title, text]) => <LegalSection key={title} title={title}><p>{text}</p></LegalSection>)}
    </LegalShell>
  );
}
