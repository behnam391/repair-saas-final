"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    kavenegarApiKey: "", kavenegarSender: "", zarinpalMerchantId: "",
    guideUrl: "", aboutUsContent: "",
    smtpHost: "", smtpPort: 587, smtpUser: "", smtpPassword: "", smtpFromAddress: "",
    neshanApiKey: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/superadmin/settings").then((r) => r.json()).then((d) => setForm({
      kavenegarApiKey: d.settings?.kavenegarApiKey ?? "",
      kavenegarSender: d.settings?.kavenegarSender ?? "",
      zarinpalMerchantId: d.settings?.zarinpalMerchantId ?? "",
      guideUrl: d.settings?.guideUrl ?? "",
      aboutUsContent: d.settings?.aboutUsContent ?? "",
      smtpHost: d.settings?.smtpHost ?? "", smtpPort: d.settings?.smtpPort ?? 587,
      smtpUser: d.settings?.smtpUser ?? "", smtpPassword: d.settings?.smtpPassword ?? "",
      smtpFromAddress: d.settings?.smtpFromAddress ?? "",
      neshanApiKey: d.settings?.neshanApiKey ?? "",
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

      <div className="text-sm font-bold mb-2">پیامک و پرداخت</div>
      <label className="block text-xs text-muted mb-1">کلید API کاوه‌نگار</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.kavenegarApiKey} onChange={(e) => setForm({ ...form, kavenegarApiKey: e.target.value })} />

      <label className="block text-xs text-muted mb-1">شماره خط ارسال کاوه‌نگار</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.kavenegarSender} onChange={(e) => setForm({ ...form, kavenegarSender: e.target.value })} />

      <label className="block text-xs text-muted mb-1">مرچنت کد زرین‌پال</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
        value={form.zarinpalMerchantId} onChange={(e) => setForm({ ...form, zarinpalMerchantId: e.target.value })} />

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
