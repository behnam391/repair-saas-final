import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";
import { getPublicLocale } from "@/lib/public-locales";

const CONTENT = {
  fa: {
    title: "قوانین و مقررات استفاده", updated: "مرداد ۱۴۰۵",
    intro: "با ثبت‌نام و استفاده از سکوی «پیوو» (Peyvo)، شما این قوانین را مطالعه کرده و می‌پذیرید. لطفاً پیش از استفاده، آن‌ها را با دقت بخوانید.",
    sections: [
      ["۱) معرفی سرویس", "پیوو یک سکوی نرم‌افزاری برای مدیریت گردش‌کار تعمیرگاه‌های موبایل و کامپیوتر و ایجاد ارتباط میان تعمیرکار، فروشنده و مشتری است. این سرویس شامل مدیریت پذیرش و تعمیر دستگاه، صدور فاکتور، مدیریت مشتریان و امکانات مرتبط می‌شود."],
      ["۲) حساب کاربری", "مسئولیت حفظ محرمانگی رمز عبور و همه فعالیت‌هایی که از طریق حساب شما انجام می‌شود بر عهده خودتان است. اطلاعات ثبت‌نام باید صحیح و متعلق به شما باشد. استفاده از حساب دیگران یا ارائه اطلاعات جعلی مجاز نیست."],
      ["۳) تعهدات کاربر", "شما متعهد می‌شوید از سرویس فقط برای مقاصد قانونی استفاده کنید و از انتشار محتوای غیرقانونی، توهین‌آمیز یا ناقض حقوق دیگران خودداری نمایید. تلاش برای اخلال در سرویس، دسترسی غیرمجاز یا سوءاستفاده از داده‌های سایر کاربران ممنوع است."],
      ["۴) نقش پیوو", "پیوو ابزار مدیریت کسب‌وکار و بستر واسط است. کیفیت خدمات تعمیر، صحت معاملات میان مغازه و مشتری و توافق‌های مالی میان کاربران بر عهده طرفین همان معامله است و پیوو در این موارد مسئولیتی نمی‌پذیرد."],
      ["۵) اشتراک و پرداخت", "برخی امکانات در قالب پلن‌های اشتراکی ارائه می‌شوند. هزینه و مدت هر پلن پیش از پرداخت نمایش داده می‌شود. پس از پایان اعتبار یا عدم پرداخت، دسترسی به امکانات ویژه محدود می‌شود. شرایط استرداد در صفحه سیاست بازگشت وجه آمده است."],
      ["۶) مالکیت معنوی", "برند، طراحی، کد و محتوای پیوو متعلق به این مجموعه است و کپی‌برداری یا بهره‌برداری تجاری بدون اجازه کتبی مجاز نیست."],
      ["۷) تعلیق یا خاتمه حساب", "در صورت نقض این قوانین، پیوو می‌تواند حساب کاربر را موقتاً یا دائماً تعلیق کند. کاربر نیز می‌تواند هر زمان حساب خود را حذف کند."],
      ["۸) تغییر در قوانین", "این قوانین ممکن است به‌روزرسانی شوند. نسخه جدید از طریق همین صفحه منتشر می‌شود و ادامه استفاده از سرویس به‌منزله پذیرش تغییرات است."],
      ["۹) قانون حاکم", "این قوانین تابع قوانین جمهوری اسلامی ایران است و اختلاف‌ها مطابق مقررات جاری کشور رسیدگی می‌شوند."],
      ["۱۰) تماس با ما", "برای هر پرسش از بخش پشتیبانی داخل پنل یا ایمیل support@peyvo.ir استفاده کنید."],
    ],
  },
  en: {
    title: "Terms of Use", updated: "August 2026",
    intro: "By registering for or using Peyvo, you confirm that you have read and accepted these terms. Please review them carefully before using the service.",
    sections: [
      ["1) The service", "Peyvo is a software platform for managing mobile and computer repair workflows and connecting repair professionals, suppliers and customers. Features include device intake and repair management, invoicing, customer records and related operational tools."],
      ["2) Your account", "You are responsible for keeping your password confidential and for activity performed through your account. Registration information must be accurate and belong to you. Using another person's account or providing false information is prohibited."],
      ["3) Acceptable use", "You must use Peyvo only for lawful purposes. Illegal, abusive or rights-infringing content is prohibited, as are attempts to disrupt the service, gain unauthorised access or misuse another user's data."],
      ["4) Peyvo's role", "Peyvo provides business-management tools and a technical platform. The parties to each transaction remain responsible for repair quality, the accuracy of transactions, and financial agreements between a repair business and its customer or partner."],
      ["5) Subscriptions and payments", "Some features require a subscription. Price and duration are displayed before purchase. Premium access may be limited after expiry or non-payment. Eligible refunds are described in the Refund Policy."],
      ["6) Intellectual property", "The Peyvo brand, design, software and content belong to Peyvo. Copying or commercial exploitation without written permission is prohibited."],
      ["7) Suspension and termination", "Peyvo may temporarily or permanently suspend accounts that breach these terms. You may also request deletion of your account at any time."],
      ["8) Changes to these terms", "These terms may be updated. The latest version will be published here. Continued use after an update constitutes acceptance of the revised terms."],
      ["9) Governing law", "These terms are governed by the laws of the Islamic Republic of Iran, and disputes will be handled under applicable Iranian law."],
      ["10) Contact", "For questions, use support inside the platform or email support@peyvo.ir."],
    ],
  },
  ar: {
    title: "شروط الاستخدام", updated: "أغسطس 2026",
    intro: "بتسجيلك في Peyvo أو استخدامه، فإنك تؤكد أنك قرأت هذه الشروط ووافقت عليها. يرجى مراجعتها بعناية قبل استخدام الخدمة.",
    sections: [
      ["1) تعريف الخدمة", "Peyvo منصة برمجية لإدارة سير عمل صيانة الهواتف والحواسيب وربط فنيي الصيانة والمورّدين والعملاء. تشمل الخدمة استلام الأجهزة وإدارة الصيانة والفواتير وسجلات العملاء والأدوات التشغيلية المرتبطة بها."],
      ["2) حسابك", "أنت مسؤول عن سرية كلمة المرور وجميع الأنشطة التي تتم عبر حسابك. يجب أن تكون معلومات التسجيل صحيحة وتخصك. يُحظر استخدام حساب شخص آخر أو تقديم معلومات زائفة."],
      ["3) الاستخدام المقبول", "يجب استخدام Peyvo لأغراض قانونية فقط. يُحظر نشر محتوى غير قانوني أو مسيء أو منتهك لحقوق الغير، كما يُحظر تعطيل الخدمة أو محاولة الوصول غير المصرح به أو إساءة استخدام بيانات الآخرين."],
      ["4) دور Peyvo", "يوفر Peyvo أدوات لإدارة الأعمال ومنصة تقنية وسيطة. تبقى مسؤولية جودة الصيانة وصحة المعاملات والاتفاقات المالية بين مركز الصيانة والعميل أو الشريك على أطراف المعاملة نفسها."],
      ["5) الاشتراكات والمدفوعات", "تتطلب بعض المزايا اشتراكاً. يظهر السعر والمدة قبل الشراء، وقد يتم تقييد المزايا المدفوعة عند انتهاء الاشتراك أو عدم السداد. توضح سياسة الاسترداد الحالات المؤهلة لإعادة المبلغ."],
      ["6) الملكية الفكرية", "علامة Peyvo وتصميمه وبرمجياته ومحتواه ملك لـ Peyvo. يُحظر النسخ أو الاستغلال التجاري من دون إذن كتابي."],
      ["7) تعليق الحساب وإنهاؤه", "يجوز لـ Peyvo تعليق الحساب مؤقتاً أو دائماً عند مخالفة هذه الشروط. ويمكنك أيضاً طلب حذف حسابك في أي وقت."],
      ["8) تعديل الشروط", "قد يتم تحديث هذه الشروط، وستُنشر أحدث نسخة هنا. استمرار استخدام الخدمة بعد التحديث يعني قبول الشروط المعدلة."],
      ["9) القانون الحاكم", "تخضع هذه الشروط لقوانين الجمهورية الإسلامية الإيرانية، وتتم معالجة النزاعات وفق القوانين الإيرانية النافذة."],
      ["10) التواصل معنا", "للاستفسارات استخدم قسم الدعم داخل المنصة أو راسل support@peyvo.ir."],
    ],
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams?: { lang?: string | string[] } }): Metadata {
  const locale = getPublicLocale(searchParams?.lang);
  return { title: `${CONTENT[locale].title} | Peyvo` };
}

export default function TermsPage({ searchParams }: { searchParams?: { lang?: string | string[] } }) {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = CONTENT[locale];
  return (
    <LegalShell title={copy.title} updated={copy.updated} locale={locale} pagePath="/terms">
      <p className="text-muted">{copy.intro}</p>
      {copy.sections.map(([title, text]) => <LegalSection key={title} title={title}><p>{text}</p></LegalSection>)}
    </LegalShell>
  );
}
