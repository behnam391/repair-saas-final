"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PROVINCE_NAMES } from "@/lib/iran-locations";

type ShopRow = {
  id: string; name: string; type: string; address: string | null; province: string | null;
  verificationLevel: number; ratingAvg: number; ratingCount: number;
};

export default function CustomerShopsPage() {
  const [province, setProvince] = useState("");
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (province) params.set("province", province);
    if (query) params.set("query", query);
    const res = await fetch(`/api/customer/shops?${params.toString()}`);
    if (res.ok) setShops((await res.json()).shops ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [province]);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">مغازه‌های اطراف شما</h1>
      <p className="text-xs text-muted mb-4">بر اساس استان جستجو کنید و امتیازات را مقایسه کنید</p>

      <div className="flex gap-2 mb-4">
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجوی نام مغازه..." value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()} />
        <select className="bg-surface2 border border-surface2 rounded-lg px-2 text-sm" value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="">همه استان‌ها</option>
          {PROVINCE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">در حال بارگذاری...</p>
      ) : shops.length === 0 ? (
        <p className="text-xs text-muted text-center py-8">مغازه‌ای یافت نشد.</p>
      ) : (
        <div className="space-y-2">
          {shops.map((s) => (
            <Link key={s.id} href={`/customer/shops/${s.id}`} className="block bg-surface2 border border-surface2 rounded-lg p-3 text-xs hover:border-copper transition">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    {s.name}
                    {s.verificationLevel === 3 && <span className="text-[9px] bg-teal/20 text-teal rounded-full px-1.5">✅ تأییدشده</span>}
                  </div>
                  <div className="text-muted mt-0.5">{s.province}{s.address ? ` — ${s.address}` : ""}</div>
                </div>
                <div className="text-left shrink-0">
                  {s.ratingCount > 0 ? (
                    <>
                      <div className="text-amber font-bold">★ {s.ratingAvg.toFixed(1)}</div>
                      <div className="text-muted text-[10px]">{s.ratingCount} نظر</div>
                    </>
                  ) : (
                    <div className="text-muted text-[10px]">بدون امتیاز</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
