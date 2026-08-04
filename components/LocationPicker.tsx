"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// react-neshan-map-leaflet touches `window`/`document` on import, so it
// must never be evaluated during server-side rendering.
const NeshanMap = dynamic(() => import("react-neshan-map-leaflet"), { ssr: false });

export default function LocationPicker({
  apiKey,
  latitude,
  longitude,
  onChange,
}: {
  apiKey: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Default to Tehran if the shop hasn't picked a spot yet.
  const center: [number, number] = [latitude ?? 35.6892, longitude ?? 51.389];

  return (
    <div className="rounded-lg overflow-hidden border border-surface2" style={{ height: 280 }}>
      <NeshanMap
        options={{
          key: apiKey,
          maptype: "dreamy",
          poi: true,
          traffic: false,
          center,
          zoom: latitude ? 15 : 11,
        }}
        onInit={(L: any, myMap: any) => {
          setReady(true);
          const marker = L.marker(center, { draggable: true }).addTo(myMap);
          markerRef.current = marker;

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onChange(pos.lat, pos.lng);
          });

          myMap.on("click", (e: any) => {
            marker.setLatLng(e.latlng);
            onChange(e.latlng.lat, e.latlng.lng);
          });
        }}
      />
      {!ready && <p className="text-[10px] text-muted p-2">در حال بارگذاری نقشه...</p>}
    </div>
  );
}
