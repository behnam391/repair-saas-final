"use client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [form, setForm] = useState({ avatarUrl: "", email: "", gmailId: "", telegramId: "", notifyEmail: false, notifyTelegram: false });
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setName(data.user.name);
      setForm({
        avatarUrl: data.user.avatarUrl ?? "", email: data.user.email ?? "", gmailId: data.user.gmailId ?? "",
        telegramId: data.user.telegramId ?? "", notifyEmail: data.user.notifyEmail, notifyTelegram: data.user.notifyTelegram,
      });
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="display-heading text-lg mb-4">پروفایل من</h1>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-16 h-16 rounded-full bg-surface2 border border-surface2 overflow-hidden flex items-center justify-center text-lg font-bold">
          {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" /> : name.slice(0, 2)}
        </div>
        <div className="text-sm font-bold">{name}</div>
      </div>

      <label className="block text-xs text-muted mb-1">آدرس عکس پروفایل (لینک تصویر)</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-1"
        placeholder="https://..."
        value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
      <p className="text-[10px] text-muted mb-3">فعلاً فقط لینک تصویر پشتیبانی می‌شود؛ آپلود مستقیم فایل به‌زودی اضافه می‌شود.</p>

      <label className="block text-xs text-muted mb-1">ایمیل</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

      <label className="block text-xs text-muted mb-1">آیدی جیمیل (برای اطلاع‌رسانی)</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
        value={form.gmailId} onChange={(e) => setForm({ ...form, gmailId: e.target.value })} />
      <label className="flex items-center gap-2 text-xs text-muted mb-3">
        <input type="checkbox" checked={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })} />
        اطلاع‌رسانی از طریق ایمیل/جیمیل فعال باشد
      </label>

      <label className="block text-xs text-muted mb-1">آیدی تلگرام</label>
      <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
        placeholder="@username"
        value={form.telegramId} onChange={(e) => setForm({ ...form, telegramId: e.target.value })} />
      <label className="flex items-center gap-2 text-xs text-muted mb-4">
        <input type="checkbox" checked={form.notifyTelegram} onChange={(e) => setForm({ ...form, notifyTelegram: e.target.checked })} />
        اطلاع‌رسانی از طریق تلگرام فعال باشد
      </label>
      <p className="text-[10px] text-muted mb-4">
        ⚠️ ارسال واقعی پیام به تلگرام هنوز فعال نیست (نیاز به راه‌اندازی ربات تلگرام دارد)؛ فعلاً فقط این اطلاعات ذخیره می‌شود.
      </p>

      <button onClick={save} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
        {saved ? "✅ ذخیره شد" : "ذخیره تغییرات"}
      </button>
    </div>
  );
}
