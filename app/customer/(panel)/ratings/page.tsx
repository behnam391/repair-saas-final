"use client";
import { useEffect, useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";

type MyRating = {
  id: string; stars: number; comment: string | null; createdAt: string;
  shop: { id: string; name: string; province: string | null };
};

export default function CustomerRatingsPage() {
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MyRating | null>(null);

  async function load() {
    const res = await fetch("/api/customer/rate");
    if (res.ok) setRatings((await res.json()).ratings ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="display-heading text-lg mb-1">امتیازهای من</h1>
      <p className="text-xs text-muted mb-4">
        امتیازهایی که به مغازه‌ها داده‌اید. می‌توانید هر امتیاز و نظر را همین‌جا ویرایش کنید.
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
            <div key={r.id} className="bg-surface border border-surface2 rounded-xl p-3 text-xs card-hover">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold">{r.shop.name}<span className="text-muted font-normal">{r.shop.province ? ` · ${r.shop.province}` : ""}</span></div>
                <div className="text-amber font-bold" dir="ltr">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
              </div>
              {r.comment && <p className="text-muted mt-1.5">{r.comment}</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] text-muted">{formatJalaliDate(r.createdAt)}</div>
                <button onClick={() => setEditing(r)} className="text-teal text-[11px] font-bold">ویرایش امتیاز و نظر</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditRatingModal
          rating={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditRatingModal({ rating, onClose, onSaved }: { rating: MyRating; onClose: () => void; onSaved: () => void }) {
  const [stars, setStars] = useState(rating.stars);
  const [comment, setComment] = useState(rating.comment ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/customer/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: rating.shop.id, stars, comment: comment || undefined }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4" onClick={onClose}>
      <div className="bg-surface border border-surface2 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-sm mb-1">امتیاز به {rating.shop.name}</h2>
        <p className="text-[11px] text-muted mb-4">امتیاز جدید جایگزین امتیاز قبلی شما می‌شود.</p>
        <div className="flex justify-center gap-2 mb-4 text-3xl" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)}
              className={n <= stars ? "text-amber" : "text-muted opacity-40"}>★</button>
          ))}
        </div>
        <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs mb-3" rows={3}
          placeholder="نظر شما درباره این مغازه (اختیاری)..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-amber text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
            {saving ? "..." : "ذخیره تغییرات"}
          </button>
          <button onClick={onClose} className="bg-surface2 border border-border rounded-lg px-4 py-2.5 text-sm">انصراف</button>
        </div>
      </div>
    </div>
  );
}
