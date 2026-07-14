"use client";
import { useEffect, useState } from "react";
import { PROVINCE_NAMES } from "@/lib/iran-locations";

type ShopRank = { id: string; name: string; province: string | null; address: string | null; ratingCount: number; avgRating: number };

export default function RankingsPage() {
  const [province, setProvince] = useState("");
  const [shops, setShops] = useState<ShopRank[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = province ? `?province=${encodeURIComponent(province)}` : "";
    const res = await fetch(`/api/rankings${qs}`);
    if (res.ok) setShops((await res.json()).shops ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [province]);

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">بهترین تعمیرگاه‌های کشور</h1>
      <p className="text-xs text-muted mb-4">بر اساس امتیاز مشتریان — رتبه‌بندی سراسری یا استانی</p>

      <select className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
        value={province} onChange={(e) => setProvince(e.target.value)}>
        <option value="">🇮🇷 رتبه‌بندی سراسری (کل کشور)</option>
        {PROVINCE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">در حال بارگذاری...</p>
      ) : shops.length === 0 ? (
        <p className="text-xs text-muted text-center py-8">هنوز مغازه‌ای با حداقل ۳ امتیاز در این محدوده ثبت نشده.</p>
      ) : (
        <div className="space-y-2">
          {shops.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
              <div className="text-lg font-extrabold text-copper w-6 text-center">{i + 1}</div>
              <div className="flex-1">
                <div className="font-bold">{s.name}</div>
                <div className="text-muted mt-0.5">{s.province}{s.address ? ` · ${s.address}` : ""}</div>
              </div>
              <div className="text-left">
                <div className="text-amber font-bold">★ {s.avgRating.toFixed(1)}</div>
                <div className="text-muted text-[10px]">{s.ratingCount} نظر</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
