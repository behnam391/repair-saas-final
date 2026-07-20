"use client";
import { useEffect, useState } from "react";

type MyRating = {
  id: string; stars: number; comment: string | null; createdAt: string;
  shop: { id: string; name: string; province: string | null };
};

export default function CustomerRatingsPage() {
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/customer/rate");
      if (res.ok) setRatings((await res.json()).ratings ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="display-heading text-lg mb-1">امتیازهای من</h1>
      <p className="text-xs text-muted mb-4">
        امتیازهایی که از پنل خودتان به مغازه‌ها داده‌اید. برای ویرایش، از صفحه «مغازه‌ها» دوباره امتیاز بدهید.
      </p>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">در حال بارگذاری...</p>
      ) : ratings.length === 0 ? (
        <div className="text-xs text-muted text-center py-8 leading-6">
          هنوز به مغازه‌ای امتیاز نداده‌اید.
          <br /><a href="/customer" className="text-teal">مغازه‌ها را ببینید و اولین امتیازتان را ثبت کنید ↗</a>
        </div>
      ) : (
        <div className="space-y-2">
          {ratings.map((r) => (
            <div key={r.id} className="bg-surface border border-surface2 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold">{r.shop.name}<span className="text-muted font-normal">{r.shop.province ? ` · ${r.shop.province}` : ""}</span></div>
                <div className="text-amber font-bold" dir="ltr">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
              </div>
              {r.comment && <p className="text-muted mt-1.5">{r.comment}</p>}
              <div className="text-[10px] text-muted mt-1.5">{new Date(r.createdAt).toLocaleDateString("fa-IR")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
