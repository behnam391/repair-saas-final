"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", message: "", link: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function send() {
    if (!form.title || !form.message) return;
    const res = await fetch("/api/superadmin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSent(true);
      setForm({ title: "", message: "", link: "" });
      setTimeout(() => setSent(false), 3000);
    }
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">ارسال اعلان عمومی</h1>
      <p className="text-[11px] text-muted mb-4">این اعلان برای همه کاربران فعال در تمام مغازه‌های سراسر کشور ارسال می‌شود.</p>

      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3" placeholder="عنوان"
        value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3" placeholder="متن پیام"
        value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4" placeholder="لینک داخلی (اختیاری، مثلاً /market)"
        value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />

      {sent && <p className="text-teal text-xs mb-3">✅ اعلان برای همه ارسال شد.</p>}
      <button onClick={send} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
        ارسال به همه
      </button>
    </div>
  );
}
