"use client";
import { useEffect, useState } from "react";

type Ad = { id: string; imageUrl: string; linkUrl: string | null; displayType: string; title?: string | null; description?: string | null; ctaLabel?: string | null };

const PEYVO_SAMPLE_AD: Ad = {
  id: "peyvo-sample-ad",
  imageUrl: "/images/peyvo-ai-assistant-v2.png",
  linkUrl: "/tickets",
  displayType: "BANNER",
  title: "پذیرش منظم‌تر با پیوو",
  description: "اطلاعات دستگاه و مشتری را یک‌بار ثبت کنید و مراحل تعمیر را دقیق پیگیری کنید.",
  ctaLabel: "پذیرش دستگاه",
};

export default function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetch("/api/ads").then((r) => r.json()).then((d) => setAds(d.ads ?? []));
  }, []);

  const banner = ads.find((a) => a.displayType === "BANNER") ?? PEYVO_SAMPLE_AD;
  if (hidden) return null;
  const opensExternally = Boolean(banner.linkUrl && /^https?:\/\//i.test(banner.linkUrl));

  const content = <>
    <span className="dashboard-ad-label">پیشنهاد ویژه</span>
    <img src={banner.imageUrl} alt={banner.title || "پیشنهاد ویژه"} loading="lazy" decoding="async" onError={() => setHidden(true)} />
    <span className="dashboard-ad-copy"><b>{banner.title || "پیشنهاد منتخب پیوو"}</b><small>{banner.description || "خدمات و پیشنهادهای مرتبط با تعمیرگاه‌ها"}</small></span>
    {banner.linkUrl && <strong>{banner.ctaLabel || "مشاهده"}</strong>}
  </>;

  return (
    banner.linkUrl
      ? <a className="dashboard-ad-slot no-print" href={banner.linkUrl} target={opensExternally ? "_blank" : undefined} rel={opensExternally ? "noopener noreferrer" : undefined}>{content}</a>
      : <div className="dashboard-ad-slot no-print">{content}</div>
  );
}
