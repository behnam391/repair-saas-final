"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ShopDetail = {
  id: string; name: string; address: string | null; province: string | null; phone: string | null; landlinePhone: string | null;
  verificationLevel: number; latitude: number | null; longitude: number | null;
  ratingAvg: number; ratingCount: number; reviews: { stars: number; comment: string | null; createdAt: string }[];
};

export default function CustomerShopDetailPage() {
  const params = useParams();
  const shopId = params.id as string;
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [myRating, setMyRating] = useState<{ stars: number; comment: string | null } | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch(`/api/customer/shops/${shopId}`);
    if (res.ok) {
      const data = await res.json();
      setShop(data.shop);
      setMyRating(data.myRating);
      if (data.myRating) { setStars(data.myRating.stars); setComment(data.myRating.comment ?? ""); }
    }
  }
  useEffect(() => { load(); }, [shopId]);

  async function submitRating() {
    if (stars === 0) return;
    await fetch("/api/customer/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, stars, comment: comment || undefined }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  }

  if (!shop) return <p className="p-4 text-sm text-muted text-center">در حال بارگذاری...</p>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="display-heading text-lg mb-1">{shop.name}</h1>
      {shop.ratingCount > 0 && (
        <div className="text-amber font-bold text-sm mb-3">★ {shop.ratingAvg.toFixed(1)} <span className="text-muted font-normal">({shop.ratingCount} نظر)</span></div>
      )}
      <div className="text-xs text-muted space-y-1 mb-4">
        {shop.province && <div>📍 {shop.province}{shop.address ? ` — ${shop.address}` : ""}</div>}
        {shop.phone && <div>📱 {shop.phone}</div>}
      </div>
      <div className="flex gap-2 mb-6">
        {shop.phone && <a href={`tel:${shop.phone}`} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-2 text-sm text-center">تماس</a>}
        {shop.latitude && shop.longitude && (
          <a href={`https://maps.google.com/?q=${shop.latitude},${shop.longitude}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 bg-surface2 rounded-lg py-2 text-sm text-center">مسیریابی</a>
        )}
      </div>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-2">{myRating ? "ویرایش امتیاز شما" : "امتیاز بدهید"}</div>
        <div className="flex justify-center gap-1 mb-3" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} className="text-3xl">{n <= stars ? "★" : "☆"}</button>
          ))}
        </div>
        <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="نظر شما (اختیاری)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button onClick={submitRating} disabled={stars === 0} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
          {saved ? "✅ ثبت شد" : myRating ? "به‌روزرسانی امتیاز" : "ثبت امتیاز"}
        </button>
      </div>

      <div className="text-sm font-bold mb-2">نظرات دیگران</div>
      <div className="space-y-2">
        {shop.reviews.length === 0 && <p className="text-xs text-muted">هنوز نظری ثبت نشده.</p>}
        {shop.reviews.map((r, i) => (
          <div key={i} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="text-amber">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
            {r.comment && <div className="mt-1">{r.comment}</div>}
            <div className="text-[10px] text-muted mt-1">{new Date(r.createdAt).toLocaleDateString("fa-IR")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
