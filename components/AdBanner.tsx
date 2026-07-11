"use client";
import { useEffect, useState } from "react";

type Ad = { id: string; imageUrl: string; linkUrl: string | null };

export default function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/ads").then((r) => r.json()).then((d) => setAds(d.ads ?? []));
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads]);

  if (ads.length === 0) return null;
  const ad = ads[index];

  const content = (
    <img src={ad.imageUrl} alt="تبلیغ" className="w-full h-full object-cover rounded-xl" />
  );

  return (
    <div className="mx-3 mt-3 rounded-xl overflow-hidden border border-surface2 h-20 bg-surface2">
      {ad.linkUrl ? <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">{content}</a> : content}
    </div>
  );
}
