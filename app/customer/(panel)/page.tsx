"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IRAN_PROVINCES, PROVINCE_NAMES } from "@/lib/iran-locations";
import ShopsMap from "@/components/ShopsMap";
import { BadgeCheck, Building2, List, LocateFixed, Map, MapPin, Navigation, Phone, Search, ShieldCheck, Star } from "lucide-react";

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
  const [appliedQuery, setAppliedQuery] = useState("");
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [neshanKey, setNeshanKey] = useState<string | null>(null);
  const requestId = useRef(0);

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

  const load = useCallback(async (p: string, c: string, query: string) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams();
    if (p) params.set("province", p);
    if (c) params.set("city", c);
    if (query) params.set("q", query);
    try {
      const res = await fetch(`/api/customer/shops?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("shops_request_failed");
      if (currentRequest === requestId.current) setShops((await res.json()).shops ?? []);
    } catch {
      if (currentRequest === requestId.current) {
        setShops([]);
        setLoadError("دریافت فهرست تعمیرگاه‌ها ممکن نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(province, city, appliedQuery); }, [province, city, appliedQuery, load]);

  function applySearch() {
    const next = q.trim();
    if (next === appliedQuery) load(province, city, next);
    else setAppliedQuery(next);
  }

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
    if (res.ok) { setRatingShop(null); setComment(""); setStars(5); load(province, city, appliedQuery); }
  }

  return (
    <div className="customer-directory-page">
      <section className="customer-directory-hero">
        <div><span className="customer-directory-eyebrow"><ShieldCheck size={16} /> شبکه تعمیرگاه‌های پیوو</span><h1>تعمیرگاه مناسب را با اطمینان پیدا کنید</h1><p>همه تعمیرگاه‌های فعال را ببینید، بر اساس شهر یا فاصله جستجو کنید و تجربه مشتریان را مقایسه کنید.</p></div>
        <div className="customer-directory-summary"><span><Building2 size={19} /><b>{loading ? "…" : shops.length.toLocaleString("fa-IR")}</b><small>مرکز قابل مشاهده</small></span><span><MapPin size={19} /><b>اردبیل</b><small>پوشش اولیه</small></span></div>
      </section>

      <section className="customer-directory-filters">
      <div className="customer-filter-title"><div><Search size={19} /><span><b>جستجوی تعمیرگاه</b><small>بدون انتخاب فیلتر، همه مراکز فعال نمایش داده می‌شوند</small></span></div>{province || city || appliedQuery ? <button onClick={() => { setProvince(""); setCity(""); setQ(""); setAppliedQuery(""); }}>پاک کردن فیلترها</button> : null}</div>
      <div className="customer-location-fields">
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

      <div className="customer-search-row">
        <input className="flex-1 min-w-0 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجوی نام مغازه..." value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()} />
        <button onClick={applySearch}><Search size={17} /> جستجو</button>
      </div>
      <button onClick={locateMe}
        className={`customer-nearby-button ${sortByDistance ? "is-active" : ""}`}>
        <LocateFixed size={18} /> نزدیک‌ترین تعمیرگاه‌ها به من
      </button>
      </section>

      <div className="customer-view-tabs">
        <button onClick={() => setView("list")}
          className={view === "list" ? "is-active" : ""}>
          <List size={17} /> فهرست
        </button>
        <button onClick={() => setView("map")}
          className={view === "map" ? "is-active" : ""}>
          <Map size={17} /> نقشه
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
      ) : loadError ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-center">
          <p className="text-xs text-danger leading-6">{loadError}</p>
          <button onClick={() => load(province, city, appliedQuery)} className="mt-3 rounded-lg bg-surface2 px-4 py-2 text-xs font-bold">تلاش دوباره</button>
        </div>
      ) : display.length === 0 ? (
        <div className="rounded-xl border border-surface2 bg-surface p-5 text-center">
          <div className="text-2xl mb-2">📍</div>
          <h2 className="text-sm font-bold mb-1">هنوز تعمیرگاه فعالی در این محدوده نداریم</h2>
          <p className="text-[11px] text-muted leading-6">پوشش فعلی پیوو در اردبیل است. می‌توانید مراکز فعال اردبیل یا همه تعمیرگاه‌های ثبت‌شده را ببینید.</p>
          <div className="mt-3 flex justify-center gap-2 flex-wrap">
            <button onClick={() => { setProvince("اردبیل"); setCity(""); setQ(""); setAppliedQuery(""); }} className="rounded-lg bg-teal px-3 py-2 text-[11px] font-bold text-white">نمایش مراکز اردبیل</button>
            <button onClick={() => { setProvince(""); setCity(""); setQ(""); setAppliedQuery(""); }} className="rounded-lg bg-surface2 px-3 py-2 text-[11px] font-bold">حذف همه فیلترها</button>
          </div>
        </div>
      ) : (
        <div className="customer-shop-grid">
          {display.map((s) => (
            <article key={s.id} className="customer-shop-card">
              <div className="customer-shop-card-head">
                <div className="customer-shop-identity"><i><Building2 size={21} /></i><div>
                  <div className="customer-shop-name">
                    {s.name}
                    {s.verificationLevel >= 3 && <span><BadgeCheck size={13} /> تأییدشده</span>}
                    {s.verificationLevel === 2 && <span className="text-[10px] bg-amber/15 text-amber rounded px-1.5 py-0.5">پروفایل کامل</span>}
                  </div>
                  <div className="customer-shop-location"><MapPin size={13} />
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
                  )}</div></div>
                <div className="customer-shop-rating">
                  {s.ratingCount > 0 ? (
                    <>
                      <div><Star size={15} fill="currentColor" /> {s.avgRating.toFixed(1)}</div>
                      <div className="text-muted text-[10px]">{s.ratingCount} نظر</div>
                    </>
                  ) : (
                    <div className="text-muted text-[10px]">بدون امتیاز</div>
                  )}
                </div>
              </div>

              <div className="customer-shop-actions">
                <a href={`/shop/${s.id}`}><Building2 size={15} /> صفحه مغازه</a>
                {s.phone && <a href={`tel:${s.phone}`}><Phone size={15} /> تماس</a>}
                {s.latitude && s.longitude && (
                  <a target="_blank" rel="noreferrer"
                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}><Navigation size={15} /> مسیریابی</a>
                )}
                <button onClick={() => { setRatingShop(s); setStars(s.myRating ?? 5); }}
                  className="customer-rating-action"><Star size={15} />
                  {s.myRating ? `امتیاز شما: ${s.myRating}` : "ثبت امتیاز"}
                </button>
              </div>
            </article>
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
