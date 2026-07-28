"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FONT_OPTIONS } from "@/lib/fonts";

export default function SuperAdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    kavenegarApiKey: "", kavenegarSender: "", zarinpalMerchantId: "",
    paymentProvider: "zarinpal", zibalMerchant: "", nextpayApiKey: "",
    guideUrl: "", aboutUsContent: "",
    smtpHost: "", smtpPort: 587, smtpUser: "", smtpPassword: "", smtpFromAddress: "",
    neshanApiKey: "", enamadId: "", enamadCode: "",
    fontFamily: "vazirmatn", defaultTheme: "dark",
    proPriceToman: 490000, businessPriceToman: 990000,
    proQuota: 200, businessQuota: 100000,
    discount3: 5, discount6: 10, discount12: 20,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  // Load every font's stylesheet so the pickers below preview in the real
  // typeface (only the active font + Vazirmatn are loaded by the layout).
  useEffect(() => {
    FONT_OPTIONS.forEach((f) => {
      if (!f.url || document.querySelector(`link[data-font="${f.key}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = f.url;
      l.setAttribute("data-font", f.key);
      document.head.appendChild(l);
    });
  }, []);

  useEffect(() => {
    fetch("/api/superadmin/settings").then((r) => r.json()).then((d) => setForm({
      kavenegarApiKey: d.settings?.kavenegarApiKey ?? "",
      kavenegarSender: d.settings?.kavenegarSender ?? "",
      zarinpalMerchantId: d.settings?.zarinpalMerchantId ?? "",
      paymentProvider: d.settings?.paymentProvider ?? "zarinpal",
      zibalMerchant: d.settings?.zibalMerchant ?? "",
      nextpayApiKey: d.settings?.nextpayApiKey ?? "",
      guideUrl: d.settings?.guideUrl ?? "",
      aboutUsContent: d.settings?.aboutUsContent ?? "",
      smtpHost: d.settings?.smtpHost ?? "", smtpPort: d.settings?.smtpPort ?? 587,
      smtpUser: d.settings?.smtpUser ?? "", smtpPassword: d.settings?.smtpPassword ?? "",
      smtpFromAddress: d.settings?.smtpFromAddress ?? "",
      neshanApiKey: d.settings?.neshanApiKey ?? "",
      enamadId: d.settings?.enamadId ?? "",
      enamadCode: d.settings?.enamadCode ?? "",
      fontFamily: d.settings?.fontFamily ?? "vazirmatn",
      defaultTheme: d.settings?.defaultTheme ?? "dark",
      // effective = stored value, or the code default when never set
      proPriceToman: d.settings?.proPriceToman ?? 490000,
      businessPriceToman: d.settings?.businessPriceToman ?? 990000,
      proQuota: d.settings?.proQuota ?? 200,
      businessQuota: d.settings?.businessQuota ?? 100000,
      discount3: d.settings?.discount3 ?? 5,
      discount6: d.settings?.discount6 ?? 10,
      discount12: d.settings?.discount12 ?? 20,
    }));
  }, []);

  async function save() {
    setSaved(false);
    const res = await fetch("/api/superadmin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">تنظیمات پلتفرم</h1>
      <p className="text-[11px] text-muted mb-4">
        این مقادیر بر متغیرهای محیطی Vercel اولویت دارند — تغییرشان نیازی به دیپلوی مجدد ندارد.
      </p>

      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <div className="text-sm font-bold mb-1">🎨 ظاهر سایت — فونت و تم</div>
        <p className="text-[10px] text-muted mb-3">فونت و تمِ کل سایت را از همین‌جا عوض کن؛ بلافاصله و بدون دیپلوی مجدد روی همه‌ی صفحه‌ها اعمال می‌شود.</p>

        <label className="block text-[11px] font-bold mb-1.5">فونت سایت</label>
        <div className="space-y-2 mb-4">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setForm({ ...form, fontFamily: f.key })}
              className={`w-full text-right rounded-xl px-3 py-2.5 border transition ${form.fontFamily === f.key ? "border-copper bg-copper/10" : "border-surface2 bg-surface2"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold" style={{ fontFamily: f.family }}>
                  {f.label} — پیوو تعمیرگاه
                </div>
                {form.fontFamily === f.key && <span className="text-copper text-sm">✓</span>}
              </div>
              <div className="text-[10px] text-muted mt-0.5">{f.note}</div>
              <div className="text-[13px] mt-1.5 text-ink/85" style={{ fontFamily: f.family }} dir="rtl">
                نمونه: خدمات تعمیر موبایل ۱۲۳۴۵۶۷۸۹۰
              </div>
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-bold mb-1">تم پیش‌فرض بازدیدکننده‌های جدید</label>
        <p className="text-[10px] text-muted mb-2">کاربرانی که خودشان قبلاً تم را عوض کرده‌اند، انتخاب خودشان حفظ می‌شود.</p>
        <div className="flex bg-surface2 rounded-lg p-1">
          {[["dark", "🌙 شب"], ["light", "☀️ روز"]].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setForm({ ...form, defaultTheme: val })}
              className={`flex-1 text-[12px] font-bold rounded-md py-2 transition ${form.defaultTheme === val ? "bg-copper text-[#0A0F1E]" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <div className="text-sm font-bold mb-1">💳 قیمت‌گذاری اشتراک‌ها</div>
        <p className="text-[10px] text-muted mb-3">قیمت پلن‌ها و تخفیف مدت‌ها را از همین‌جا تعیین کن. هم صفحه‌ی خریدِ مغازه‌ها و هم مبلغی که در درگاه پرداخت کسر می‌شود، بلافاصله از این مقادیر استفاده می‌کنند (بدون دیپلوی مجدد).</p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mb-3">
          <div>
            <label className="block text-[11px] font-bold mb-1">حرفه‌ای — قیمت ماهانه</label>
            <div className="relative">
              <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg pr-3 pl-12 py-2 text-sm mono"
                value={form.proPriceToman} onChange={(e) => setForm({ ...form, proPriceToman: Math.max(0, +e.target.value) })} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none">تومان</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">حرفه‌ای — سهمیه ماهانه</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              value={form.proQuota} onChange={(e) => setForm({ ...form, proQuota: Math.max(0, +e.target.value) })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">تجاری — قیمت ماهانه</label>
            <div className="relative">
              <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg pr-3 pl-12 py-2 text-sm mono"
                value={form.businessPriceToman} onChange={(e) => setForm({ ...form, businessPriceToman: Math.max(0, +e.target.value) })} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none">تومان</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">تجاری — سهمیه ماهانه</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              value={form.businessQuota} onChange={(e) => setForm({ ...form, businessQuota: Math.max(0, +e.target.value) })} />
            <p className="text-[9px] text-muted mt-0.5">۱۰۰٬۰۰۰ به بالا = نامحدود</p>
          </div>
        </div>

        <label className="block text-[11px] font-bold mb-1.5">تخفیف مدت‌های بلندتر (درصد)</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([["discount3", "۳ ماهه"], ["discount6", "۶ ماهه"], ["discount12", "۱۲ ماهه"]] as const).map(([field, label]) => (
            <div key={field}>
              <span className="block text-[10px] text-muted mb-1">{label}</span>
              <div className="relative">
                <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg pr-3 pl-7 py-2 text-sm mono"
                  value={form[field]} onChange={(e) => setForm({ ...form, [field]: Math.min(100, Math.max(0, +e.target.value)) })} />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none">٪</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface2 rounded-lg p-2.5 text-[11px] space-y-1">
          <div className="text-muted mb-1">پیش‌نمایش مبلغ نهایی (با احتساب تخفیف):</div>
          {([["حرفه‌ای", form.proPriceToman], ["تجاری", form.businessPriceToman]] as const).map(([label, price]) => (
            <div key={label} className="flex justify-between">
              <span>{label} · ۱۲ ماهه</span>
              <span className="mono font-bold">{Math.round((price * 12 * (100 - form.discount12)) / 100).toLocaleString("fa-IR")} تومان</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm font-bold mb-2">پیامک و پرداخت</div>
      <label className="block text-xs text-muted mb-1">کلید API کاوه‌نگار</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.kavenegarApiKey} onChange={(e) => setForm({ ...form, kavenegarApiKey: e.target.value })} />

      <label className="block text-xs text-muted mb-1">شماره خط ارسال کاوه‌نگار</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.kavenegarSender} onChange={(e) => setForm({ ...form, kavenegarSender: e.target.value })} />

      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <label className="block text-xs font-bold mb-1">درگاه پرداخت فعال</label>
        <p className="text-[10px] text-muted mb-2">هر پرداخت با همان درگاهی که شروع شده تأیید می‌شود؛ پس می‌توانید هر زمان بدون مشکل درگاه فعال را عوض کنید.</p>
        <div className="flex bg-surface2 rounded-lg p-1 mb-3">
          {[["zarinpal", "زرین‌پال"], ["zibal", "زیبال"], ["nextpay", "نکست‌پی"]].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setForm({ ...form, paymentProvider: val })}
              className={`flex-1 text-[11px] font-bold rounded-md py-2 transition ${form.paymentProvider === val ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>

        <label className="block text-[11px] text-muted mb-1">مرچنت کد زرین‌پال {form.paymentProvider === "zarinpal" && <span className="text-teal">(فعال)</span>}</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2" dir="ltr"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={form.zarinpalMerchantId} onChange={(e) => setForm({ ...form, zarinpalMerchantId: e.target.value })} />

        <label className="block text-[11px] text-muted mb-1">مرچنت زیبال {form.paymentProvider === "zibal" && <span className="text-teal">(فعال)</span>}</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-1" dir="ltr"
          placeholder="merchant (برای تست: zibal)"
          value={form.zibalMerchant} onChange={(e) => setForm({ ...form, zibalMerchant: e.target.value })} />
        <p className="text-[10px] text-muted mb-2">اگر خالی بگذارید، از مرچنت تستِ «zibal» استفاده می‌شود (فقط برای آزمایش).</p>

        <label className="block text-[11px] text-muted mb-1">کلید API نکست‌پی {form.paymentProvider === "nextpay" && <span className="text-teal">(فعال)</span>}</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" dir="ltr"
          value={form.nextpayApiKey} onChange={(e) => setForm({ ...form, nextpayApiKey: e.target.value })} />
      </div>

      <div className="text-sm font-bold mb-2 mt-2">ایمیل (SMTP) — برای بازیابی رمز از طریق ایمیل</div>
      <p className="text-[10px] text-muted mb-2">
        مثلاً با Gmail: هاست smtp.gmail.com، پورت ۵۸۷، و به‌جای رمز عبور معمولی از «App Password» جیمیل استفاده کنید.
      </p>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" placeholder="smtp.gmail.com"
          value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
        <input type="number" className="w-20 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" placeholder="587"
          value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: +e.target.value })} />
      </div>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3" placeholder="آدرس ایمیل کاربری SMTP"
        value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
      <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3" placeholder="رمز عبور / App Password"
        value={form.smtpPassword} onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })} />
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4" placeholder="آدرس فرستنده (اختیاری، پیش‌فرض همان کاربری بالاست)"
        value={form.smtpFromAddress} onChange={(e) => setForm({ ...form, smtpFromAddress: e.target.value })} />

      <div className="text-sm font-bold mb-2 mt-2">نقشه (نشان)</div>
      <p className="text-[10px] text-muted mb-2">
        از <span dir="ltr">platform.neshan.org</span> ثبت‌نام کنید و کلید «نقشه وب» بگیرید — برای نقشه‌ی تعاملی انتخاب موقعیت مغازه استفاده می‌شود.
      </p>
      <label className="block text-xs text-muted mb-1">کلید نقشه نشان</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
        value={form.neshanApiKey} onChange={(e) => setForm({ ...form, neshanApiKey: e.target.value })} />

      <div className="text-sm font-bold mb-2 mt-2">نماد اعتماد الکترونیکی (اینماد)</div>
      <p className="text-[10px] text-muted mb-2">
        از پنل <span dir="ltr">enamad.ir</span> مقدار <span dir="ltr">id</span> و <span dir="ltr">Code</span> نماد را کپی کنید. به‌محض ذخیره، لوگوی اینماد در صفحات عمومی سایت (ورود و درباره ما) نمایش داده می‌شود — بدون <span dir="ltr">rel="noopener noreferrer"</span> تا اینماد بتواند آن را تأیید کند.
      </p>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono" dir="ltr" placeholder="id (مثلاً 123456)"
          value={form.enamadId} onChange={(e) => setForm({ ...form, enamadId: e.target.value })} />
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono" dir="ltr" placeholder="Code"
          value={form.enamadCode} onChange={(e) => setForm({ ...form, enamadCode: e.target.value })} />
      </div>

      <div className="text-sm font-bold mb-2 mt-2">راهنما و درباره ما</div>
      <label className="block text-xs text-muted mb-1">لینک راهنمای سایت (دامنه خارجی یا داخلی)</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        placeholder="https://help.example.com"
        value={form.guideUrl} onChange={(e) => setForm({ ...form, guideUrl: e.target.value })} />
      <label className="block text-xs text-muted mb-1">متن صفحه «درباره ما»</label>
      <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4" rows={4}
        value={form.aboutUsContent} onChange={(e) => setForm({ ...form, aboutUsContent: e.target.value })} />

      <button onClick={save} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
        {saved ? "✅ ذخیره شد" : "ذخیره تنظیمات"}
      </button>
    </div>
  );
}
