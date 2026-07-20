"use client";
import dynamic from "next/dynamic";

// react-neshan-map-leaflet touches window/document on import — client only.
const NeshanMap = dynamic(() => import("react-neshan-map-leaflet"), { ssr: false });

export type MapShop = {
  id: string; name: string; latitude: number | null; longitude: number | null;
  avgRating: number; ratingCount: number; address: string | null;
};

/**
 * Interactive Neshan map showing every shop that has coordinates, with a
 * popup (name, rating, link to the public shop page) on each pin. Used in
 * the customer panel's shop browser.
 */
export default function ShopsMap({
  apiKey,
  shops,
  myPos,
}: {
  apiKey: string;
  shops: MapShop[];
  myPos: { lat: number; lng: number } | null;
}) {
  const withCoords = shops.filter((s) => s.latitude != null && s.longitude != null);

  // Center on the user if located, else the first shop, else Tehran.
  const center: [number, number] = myPos
    ? [myPos.lat, myPos.lng]
    : withCoords.length
      ? [withCoords[0].latitude!, withCoords[0].longitude!]
      : [35.6892, 51.389];

  return (
    <div className="rounded-xl overflow-hidden border border-surface2" style={{ height: 380 }}>
      <NeshanMap
        options={{
          key: apiKey,
          maptype: "dreamy",
          poi: true,
          traffic: false,
          center,
          zoom: myPos || withCoords.length ? 12 : 11,
        }}
        onInit={(L: any, myMap: any) => {
          for (const s of withCoords) {
            const marker = L.marker([s.latitude, s.longitude]).addTo(myMap);
            const stars = s.ratingCount > 0 ? `★ ${s.avgRating.toFixed(1)} (${s.ratingCount} نظر)` : "بدون امتیاز";
            marker.bindPopup(
              `<div dir="rtl" style="font-family:Vazirmatn,sans-serif;font-size:12px;min-width:150px">
                 <b>${s.name}</b><br/>
                 <span style="color:#b8860b">${stars}</span><br/>
                 ${s.address ? `<span style="color:#666">${s.address}</span><br/>` : ""}
                 <a href="/shop/${s.id}" target="_blank" style="color:#0d7a63;font-weight:bold">صفحه مغازه ↗</a>
               </div>`
            );
          }
          if (myPos) {
            L.circleMarker([myPos.lat, myPos.lng], {
              radius: 8, color: "#1F7E68", fillColor: "#35C9A5", fillOpacity: 0.8,
            }).addTo(myMap).bindPopup('<div dir="rtl" style="font-size:12px">موقعیت شما</div>');
          }
        }}
      />
    </div>
  );
}
