"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Ad = { id: string; imageUrl: string; linkUrl: string | null; active: boolean; sortOrder: number; displayType: string };

export default function SuperAdminAdsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [form, setForm] = useState({ imageUrl: "", linkUrl: "", displayType: "BANNER" });

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load() {
    const res = await fetch("/api/superadmin/ads");
    if (res.ok) setAds((await res.json()).ads ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.imageUrl) return;
    await fetch("/api/superadmin/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ imageUrl: "", linkUrl: "", displayType: "BANNER" });
    load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/superadmin/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/superadmin/ads/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-4">تبلیغات سایت</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2" placeholder="آدرس تصویر بنر"
          value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2" placeholder="لینک مقصد (اختیاری)"
          value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
        <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={form.displayType} onChange={(e) => setForm({ ...form, displayType: e.target.value })}>
          <option value="BANNER">نوار تبلیغاتی (بالای صفحه)</option>
          <option value="POPUP">پاپ‌آپ قابل بستن</option>
        </select>
        <button onClick={add} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">افزودن تبلیغ</button>
      </div>

      <div className="space-y-2">
        {ads.map((a) => (
          <div key={a.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs flex items-center gap-3">
            <img src={a.imageUrl} className="w-16 h-10 object-cover rounded" />
            <div className="flex-1 truncate">{a.displayType === "POPUP" ? "پاپ‌آپ" : "بنر"} · {a.linkUrl || "بدون لینک"}</div>
            <button onClick={() => toggle(a.id, a.active)} className={`text-[10px] rounded-lg px-2 py-1 ${a.active ? "bg-teal/20 text-teal" : "bg-surface text-muted"}`}>
              {a.active ? "فعال" : "غیرفعال"}
            </button>
            <button onClick={() => remove(a.id)} className="text-danger">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
