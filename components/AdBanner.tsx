"use client";
import { useEffect, useState } from "react";

type Ad = { id: string; imageUrl: string; linkUrl: string | null; displayType: string; title?: string | null; description?: string | null; ctaLabel?: string | null };

export default function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetch("/api/ads").then((r) => r.json()).then((d) => setAds(d.ads ?? []));
  }, []);

  if (ads.length === 0) return null;

  const banner = ads.find((a) => a.displayType === "BANNER");
  if (!banner || hidden) return null;

  const content = <>
    <span className="dashboard-ad-label">پیشنهاد ویژه</span>
    <img src={banner.imageUrl} alt={banner.title || "پیشنهاد ویژه"} loading="lazy" decoding="async" onError={() => setHidden(true)} />
    <span className="dashboard-ad-copy"><b>{banner.title || "پیشنهاد منتخب پیوو"}</b><small>{banner.description || "خدمات و پیشنهادهای مرتبط با تعمیرگاه‌ها"}</small></span>
    {banner.linkUrl && <strong>{banner.ctaLabel || "مشاهده"}</strong>}
  </>;

  return (
    banner.linkUrl
      ? <a className="dashboard-ad-slot no-print" href={banner.linkUrl} target="_blank" rel="noopener noreferrer">{content}</a>
      : <div className="dashboard-ad-slot no-print">{content}</div>
  );
}
