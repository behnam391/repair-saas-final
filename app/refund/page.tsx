import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";
import { getPublicLocale } from "@/lib/public-locales";

const CONTENT = {
  fa: {
    title: "سیاست بازگشت وجه و لغو اشتراک", updated: "مرداد ۱۴۰۵", intro: "این صفحه شرایط بازگشت وجه و لغو اشتراک در سکوی پیوو را توضیح می‌دهد.",
    sections: [
      ["۱) ماهیت سرویس", "پیوو یک سرویس نرم‌افزاری اشتراکی است و خرید، دسترسی به امکانات نرم‌افزاری برای یک بازه زمانی مشخص را فراهم می‌کند."],
      ["۲) بازگشت وجه اشتراک", "به‌دلیل ماهیت دیجیتال و فعال‌شدن آنی سرویس، مبلغ اشتراک پس از فعال‌سازی معمولاً قابل استرداد نیست. اگر به‌دلیل خطای فنی از سمت ما سرویس ارائه نشده باشد یا مبلغی اشتباه یا مضاعف کسر شده باشد، مبلغ قابل بازگشت است."],
      ["۳) پرداخت میان مشتری و مغازه", "در پرداخت‌های مربوط به تعمیر یا خرید از یک مغازه، پیوو فقط بستر فنی است. توافق بازگشت وجه میان مشتری و همان مغازه انجام می‌شود و مسئولیت آن با طرفین معامله است."],
      ["۴) ثبت درخواست", "برای درخواست بازگشت وجه اشتراک، از بخش پشتیبانی داخل پنل یا ایمیل support@peyvo.ir با ذکر تاریخ و مبلغ تراکنش با ما تماس بگیرید."],
      ["۵) زمان بازگشت وجه", "پس از تأیید درخواست، مبلغ طبق روال بانکی و درگاه پرداخت، معمولاً ظرف چند روز کاری بازگردانده می‌شود."],
      ["۶) لغو اشتراک", "می‌توانید اشتراک خود را تمدید نکنید. اشتراک فعلی تا پایان دوره خریداری‌شده فعال می‌ماند و سپس به‌صورت خودکار تمدید نمی‌شود."],
      ["۷) تماس با ما", "برای پرسش‌های پرداخت و بازگشت وجه از بخش پشتیبانی یا ایمیل support@peyvo.ir استفاده کنید."],
    ],
  },
  en: {
    title: "Refund and Cancellation Policy", updated: "August 2026", intro: "This page explains subscription refunds and cancellations for the Peyvo platform.",
    sections: [
      ["1) Nature of the service", "Peyvo is a subscription software service. A purchase provides access to software features for a defined period."],
      ["2) Subscription refunds", "Because access is digital and activated immediately, subscription fees are normally non-refundable after activation. A refund may be issued when Peyvo was unavailable because of a fault on our side, or when an incorrect or duplicate charge was made."],
      ["3) Customer-to-business payments", "For repair or product payments made to a repair business, Peyvo acts only as the technical platform. Refund arrangements are made directly between that customer and business, and remain their responsibility."],
      ["4) Requesting a refund", "To request an eligible subscription refund, contact support inside Peyvo or email support@peyvo.ir with the transaction date and amount."],
      ["5) Refund timing", "After approval, funds are returned according to banking and gateway processing times, normally within several business days."],
      ["6) Cancelling a subscription", "You may choose not to renew. Your current subscription remains active until the end of the purchased term and is not renewed automatically afterwards."],
      ["7) Contact", "For payment or refund questions, use support inside Peyvo or email support@peyvo.ir."],
    ],
  },
  ar: {
    title: "سياسة الاسترداد وإلغاء الاشتراك", updated: "أغسطس 2026", intro: "توضح هذه الصفحة شروط استرداد المبالغ وإلغاء الاشتراك في منصة Peyvo.",
    sections: [
      ["1) طبيعة الخدمة", "Peyvo خدمة برمجية باشتراك، ويمنح الشراء حق الوصول إلى المزايا البرمجية لمدة محددة."],
      ["2) استرداد رسوم الاشتراك", "بسبب الطبيعة الرقمية وتفعيل الخدمة فوراً، لا تكون رسوم الاشتراك قابلة للاسترداد عادة بعد التفعيل. يمكن إعادة المبلغ إذا لم تُقدّم الخدمة بسبب خلل من جانبنا أو عند خصم مبلغ خاطئ أو مكرر."],
      ["3) مدفوعات العميل لمركز الصيانة", "في مدفوعات الصيانة أو شراء المنتجات من مركز صيانة، يعمل Peyvo بصفته منصة تقنية فقط. يتم الاتفاق على الاسترداد مباشرة بين العميل والمركز وتبقى المسؤولية عليهما."],
      ["4) طلب الاسترداد", "لطلب استرداد مؤهل لاشتراك، تواصل مع الدعم داخل Peyvo أو عبر support@peyvo.ir مع ذكر تاريخ العملية وقيمتها."],
      ["5) مدة الاسترداد", "بعد الموافقة، تتم إعادة المبلغ وفق مدة المعالجة المصرفية وبوابة الدفع، وعادة خلال عدة أيام عمل."],
      ["6) إلغاء الاشتراك", "يمكنك اختيار عدم التجديد. يبقى اشتراكك الحالي فعالاً حتى نهاية المدة المدفوعة ولا يتجدد تلقائياً بعدها."],
      ["7) التواصل معنا", "للاستفسار عن الدفع أو الاسترداد استخدم الدعم داخل Peyvo أو راسل support@peyvo.ir."],
    ],
  },
} as const;

export function generateMetadata({ searchParams }: { searchParams?: { lang?: string | string[] } }): Metadata {
  const locale = getPublicLocale(searchParams?.lang);
  return { title: `${CONTENT[locale].title} | Peyvo` };
}

export default function RefundPage({ searchParams }: { searchParams?: { lang?: string | string[] } }) {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = CONTENT[locale];
  return (
    <LegalShell title={copy.title} updated={copy.updated} locale={locale} pagePath="/refund">
      <p className="text-muted">{copy.intro}</p>
      {copy.sections.map(([title, text]) => <LegalSection key={title} title={title}><p>{text}</p></LegalSection>)}
    </LegalShell>
  );
}
