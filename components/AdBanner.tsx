"use client";
import { useEffect, useState } from "react";

type Ad = { id: string; imageUrl: string; linkUrl: string | null; displayType: string };

export default function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);
  const [popupClosed, setPopupClosed] = useState(false);

  useEffect(() => {
    fetch("/api/ads").then((r) => r.json()).then((d) => setAds(d.ads ?? []));
    setPopupClosed(sessionStorage.getItem("ad-popup-dismissed") === "1");
  }, []);

  useEffect(() => {
    const banners = ads.filter((a) => a.displayType !== "POPUP");
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [ads]);

  if (ads.length === 0) return null;

  const banners = ads.filter((a) => a.displayType !== "POPUP");
  const popup = ads.find((a) => a.displayType === "POPUP");

  function dismissPopup() {
    setPopupClosed(true);
    sessionStorage.setItem("ad-popup-dismissed", "1");
  }

  return (
    <>
      {banners.length > 0 && (
        <div className="mx-3 mt-3 rounded-xl overflow-hidden border border-surface2 h-20 bg-surface2">
          {banners[index % banners.length].linkUrl ? (
            <a href={banners[index % banners.length].linkUrl!} target="_blank" rel="noopener noreferrer">
              <img src={banners[index % banners.length].imageUrl} alt="تبلیغ" className="w-full h-full object-cover" />
            </a>
          ) : (
            <img src={banners[index % banners.length].imageUrl} alt="تبلیغ" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {popup && !popupClosed && (
        <div className="fixed bottom-4 left-4 z-[100]">
          <div className="relative w-64">
            <button onClick={dismissPopup} className="absolute -top-2.5 -right-2.5 bg-surface border border-surface2 rounded-full w-6 h-6 text-xs shadow z-10">✕</button>
            {popup.linkUrl ? (
              <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer">
                <img src={popup.imageUrl} alt="تبلیغ" className="w-64 h-40 object-cover rounded-xl shadow-lg border border-surface2" />
              </a>
            ) : (
              <img src={popup.imageUrl} alt="تبلیغ" className="w-64 h-40 object-cover rounded-xl shadow-lg border border-surface2" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
