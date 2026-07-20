"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ShopPublic = {
  name: string; address: string | null; phone: string | null; landlinePhone: string | null;
  province: string | null; type: string; verificationLevel: number;
  latitude: number | null; longitude: number | null;
  ratingAvg: number; ratingCount: number;
};

export default function ShopLandingPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const [shop, setShop] = useState<ShopPublic | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/shops/${shopId}`).then((r) => {
      if (!r.ok) { setNotFound(true); return null; }
      return r.json();
    }).then((d) => d && setShop(d.shop));
  }, [shopId]);

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-sm text-muted">این مغازه یافت نشد.</div>;
  if (!shop) return null;

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6 text-center">
        <h1 className="display-heading text-xl mb-1">{shop.name}</h1>
        {shop.verificationLevel === 3 && (
          <span className="inline-block text-[10px] bg-teal/20 text-teal rounded-full px-2 py-0.5 mb-2">✅ تأییدشده توسط پلتفرم</span>
        )}
        {shop.ratingCount > 0 ? (
          <div className="text-amber font-bold text-sm mb-3">★ {shop.ratingAvg.toFixed(1)} <span className="text-muted font-normal">({shop.ratingCount} نظر)</span></div>
        ) : (
          <div className="text-muted text-xs mb-3">هنوز امتیازی ثبت نشده</div>
        )}

        <div className="text-xs text-muted space-y-1 mb-4">
          {shop.province && <div>📍 {shop.province}{shop.address ? ` — ${shop.address}` : ""}</div>}
          {shop.phone && <div>📱 {shop.phone}</div>}
          {shop.landlinePhone && <div>☎️ {shop.landlinePhone}</div>}
        </div>

        {shop.phone && (
          <a href={`tel:${shop.phone}`} className="block bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm mb-2">
            تماس با مغازه
          </a>
        )}
        {shop.latitude && shop.longitude && (
          <a href={`https://maps.google.com/?q=${shop.latitude},${shop.longitude}`} target="_blank" rel="noopener noreferrer"
            className="block bg-surface2 rounded-lg py-2.5 text-sm">
            مسیریابی روی نقشه
          </a>
        )}
      </div>
    </div>
  );
}
