"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ kavenegarApiKey: "", kavenegarSender: "", zarinpalMerchantId: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/superadmin/settings").then((r) => r.json()).then((d) => setForm({
      kavenegarApiKey: d.settings?.kavenegarApiKey ?? "",
      kavenegarSender: d.settings?.kavenegarSender ?? "",
      zarinpalMerchantId: d.settings?.zarinpalMerchantId ?? "",
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
      <h1 className="font-extrabold text-lg mt-2 mb-1">تنظیمات اتصالات API</h1>
      <p className="text-[11px] text-muted mb-4">
        این مقادیر بر متغیرهای محیطی Vercel اولویت دارند — تغییرشان نیازی به دیپلوی مجدد ندارد.
      </p>

      <label className="block text-xs text-muted mb-1">کلید API کاوه‌نگار</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.kavenegarApiKey} onChange={(e) => setForm({ ...form, kavenegarApiKey: e.target.value })} />

      <label className="block text-xs text-muted mb-1">شماره خط ارسال کاوه‌نگار</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.kavenegarSender} onChange={(e) => setForm({ ...form, kavenegarSender: e.target.value })} />

      <label className="block text-xs text-muted mb-1">مرچنت کد زرین‌پال</label>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
        value={form.zarinpalMerchantId} onChange={(e) => setForm({ ...form, zarinpalMerchantId: e.target.value })} />

      <button onClick={save} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
        {saved ? "✅ ذخیره شد" : "ذخیره تنظیمات"}
      </button>
    </div>
  );
}
