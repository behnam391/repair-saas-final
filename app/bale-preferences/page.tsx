import BalePreference from "@/components/BalePreference";
export default function Page() {
  return <main className="max-w-lg mx-auto p-6"><h1>تنظیم پیشنهادهای بله پیوو</h1><p>برای تغییر تنظیمات با حساب مشتری یا تعمیرگاه خود وارد شوید.</p><div className="flex gap-4 my-4"><a href="/login?callbackUrl=/bale-preferences">ورود تعمیرگاه</a><a href="/customer/login?callbackUrl=/bale-preferences">ورود مشتری</a></div><BalePreference /></main>;
}
