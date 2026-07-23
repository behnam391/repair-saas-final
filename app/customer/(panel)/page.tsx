"use client";
import { useEffect, useState } from "react";
import { IRAN_PROVINCES, PROVINCE_NAMES } from "@/lib/iran-locations";
import ShopsMap from "@/components/ShopsMap";

type ShopItem = {
  id: string; name: string; address: string | null; phone: string | null;
  landlinePhone: string | null; province: string | null;
  verificationLevel: number; latitude: number | null; longitude: number | null;
  specialties: string | null;
  ratingCount: number; avgRating: number; myRating: number | null;
  distanceKm?: number | null;
};

const SPECIALTY_LABELS: Record<string, string> = {
  HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی برد",
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CustomerShopsPage() {
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [neshanKey, setNeshanKey] = useState<string | null>(null);

  // rating modal state
  const [ratingShop, setRatingShop] = useState<ShopItem | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cities = province ? IRAN_PROVINCES[province] ?? [] : [];

  // map key is public-safe (client-side rendering key, see /api/platform-info)
  useEffect(() => {
    fetch("/api/platform-info").then(async (r) => {
      if (r.ok) setNeshanKey((await r.json()).neshanApiKey ?? null);
    });
  }, []);

  // default the filter to the customer's own province once, on first load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/customer/profile");
        if (res.ok) {
          const { customer } = await res.json();
          if (customer?.province) setProvince(customer.province);
          else load("", "", "");
        } else load("", "", "");
      } catch { load("", "", ""); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(p = province, c = city, query = q) {
    setLoading(true);
    const params = new URLSearchParams();
    if (p) params.set("province", p);
    if (c) params.set("city", c);
    if (query) params.set("q", query);
    const res = await fetch(`/api/customer/shops?${params.toString()}`);
    if (res.ok) setShops((await res.json()).shops ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [province, city]);

  function locateMe() {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSortByDistance(true); },
      () => setGeoError("دسترسی به موقعیت مکانی داده نشد")
    );
  }

  let display = shops.map((s) => ({
    ...s,
    distanceKm: myPos && s.latitude && s.longitude
      ? Math.round(haversineKm(myPos.lat, myPos.lng, s.latitude, s.longitude) * 10) / 10
      : null,
  }));
  if (sortByDistance && myPos) {
    display = [...display].sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  }

  async function submitRating() {
    if (!ratingShop) return;
    setSubmitting(true);
    const res = await fetch("/api/customer/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: ratingShop.id, stars, comment: comment || undefined }),
    });
    setSubmitting(false);
    if (res.ok) { setRatingShop(null); setComment(""); setStars(5); load(); }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="display-heading text-lg mb-1">تعمیرگاه‌های اطراف شما</h1>
      <p className="text-xs text-muted mb-4">مغازه‌ها را بر اساس شهر، امتیاز مشتریان یا فاصله مقایسه کنید و مطمئن انتخاب کنید.</p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <select className="bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm"
          value={province} onChange={(e) => { setProvince(e.target.value); setCity(""); }}>
          <option value="">🇮🇷 همه استان‌ها</option>
          {PROVINCE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm"
          value={city} onChange={(e) => setCity(e.target.value)} disabled={!province}>
          <option value="">همه شهرها</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex gap-2 mb-2">
        <input className="flex-1 min-w-0 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجوی نام مغازه..." value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()} />
        <button onClick={() => load()} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm shrink-0">جستجو</button>
      </div>
      <button onClick={locateMe}
        className={`w-full rounded-lg px-3 py-2.5 text-sm font-bold mb-3 border transition ${sortByDistance ? "bg-teal text-white border-teal" : "bg-surface2 border-border"}`}>
        📍 نزدیک‌ترین تعمیرگاه‌ها به من
      </button>

      <div className="flex bg-surface2 rounded-lg p-1 mb-3">
        <button onClick={() => setView("list")}
          className={`flex-1 text-xs font-bold rounded-md py-1.5 transition ${view === "list" ? "bg-teal text-[#0B1512]" : "text-muted"}`}>
          📋 فهرست
        </button>
        <button onClick={() => setView("map")}
          className={`flex-1 text-xs font-bold rounded-md py-1.5 transition ${view === "map" ? "bg-teal text-[#0B1512]" : "text-muted"}`}>
          🗺 نقشه
        </button>
      </div>

      {view === "map" && (
        neshanKey ? (
          <div className="mb-4">
            <ShopsMap apiKey={neshanKey} shops={display} myPos={myPos} />
            <p className="text-[10px] text-muted mt-1.5">
              فقط مغازه‌هایی که موقعیت مکانی‌شان را ثبت کرده‌اند روی نقشه دیده می‌شوند
              ({display.filter((s) => s.latitude != null && s.longitude != null).length} از {display.length}).
              {!myPos && <> برای دیدن موقعیت خودتان، دکمه «📍 نزدیک‌ترین‌ها» را بزنید.</>}
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber bg-amber/10 border border-amber/30 rounded-lg p-3 mb-4">
            نقشه هنوز فعال نیست — مدیر پلتفرم باید کلید نقشه نشان را در تنظیمات ثبت کند. فعلاً از نمای فهرست استفاده کنید.
          </p>
        )
      )}
      {geoError && <p className="text-danger text-xs mb-2">{geoError}</p>}
      {sortByDistance && myPos && (
        <p className="text-[11px] text-muted mb-2">
          مرتب‌شده بر اساس فاصله از موقعیت فعلی شما ·{" "}
          <button className="text-teal" onClick={() => setSortByDistance(false)}>بازگشت به مرتب‌سازی بر اساس امتیاز</button>
        </p>
      )}

      {view === "list" && (loading ? (
        <p className="text-muted text-sm text-center py-8">در حال بارگذاری...</p>
      ) : display.length === 0 ? (
        <p className="text-xs text-muted text-center py-8">مغازه‌ای در این محدوده پیدا نشد.</p>
      ) : (
        <div className="space-y-2">
          {display.map((s) => (
            <div key={s.id} className="bg-surface border border-surface2 rounded-xl p-3 text-xs card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                    {s.name}
                    {s.verificationLevel >= 3 && <span className="text-[10px] bg-teal/15 text-teal rounded px-1.5 py-0.5">✔ تأییدشده</span>}
                    {s.verificationLevel === 2 && <span className="text-[10px] bg-amber/15 text-amber rounded px-1.5 py-0.5">پروفایل کامل</span>}
                  </div>
                  <div className="text-muted mt-1">
                    {s.province}{s.address ? ` · ${s.address}` : ""}
                    {s.distanceKm != null && <span className="text-teal font-bold"> · {s.distanceKm} کیلومتر</span>}
                  </div>
                  {s.specialties && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {s.specialties.split(",").filter(Boolean).map((sp) => (
                        <span key={sp} className="bg-surface2 rounded px-1.5 py-0.5 text-[10px] text-muted">
                          {SPECIALTY_LABELS[sp.trim()] ?? sp.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left shrink-0">
                  {s.ratingCount > 0 ? (
                    <>
                      <div className="text-amber font-bold text-sm">★ {s.avgRating.toFixed(1)}</div>
                      <div className="text-muted text-[10px]">{s.ratingCount} نظر</div>
                    </>
                  ) : (
                    <div className="text-muted text-[10px]">بدون امتیاز</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-surface2">
                <a href={`/shop/${s.id}`} className="text-teal">صفحه مغازه ↗</a>
                {s.phone && <a href={`tel:${s.phone}`} className="text-copper">📞 تماس</a>}
                {s.latitude && s.longitude && (
                  <a target="_blank" rel="noreferrer" className="text-muted"
                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}>🗺 مسیریابی</a>
                )}
                <button onClick={() => { setRatingShop(s); setStars(s.myRating ?? 5); }}
                  className="mr-auto text-amber">
                  {s.myRating ? `★ امتیاز شما: ${s.myRating} (ویرایش)` : "⭐ ثبت امتیاز"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {ratingShop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setRatingShop(null)}>
          <div className="bg-surface border border-surface2 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-sm mb-1">امتیاز به {ratingShop.name}</h2>
            <p className="text-[11px] text-muted mb-4">هر مشتری برای هر مغازه یک امتیاز دارد؛ امتیاز جدید جایگزین قبلی می‌شود.</p>
            <div className="flex justify-center gap-2 mb-4 text-2xl" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)}
                  className={n <= stars ? "text-amber" : "text-muted opacity-40"}>★</button>
              ))}
            </div>
            <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs mb-3" rows={3}
              placeholder="نظر شما (اختیاری)..." value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={submitRating} disabled={submitting}
                className="flex-1 bg-amber text-[#1A1410] font-bold rounded-lg py-2 text-sm disabled:opacity-60">
                {submitting ? "..." : "ثبت امتیاز"}
              </button>
              <button onClick={() => setRatingShop(null)} className="bg-surface2 rounded-lg px-4 py-2 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
