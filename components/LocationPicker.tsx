"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, LoaderCircle } from "lucide-react";

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
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Default to Tehran if the shop hasn't picked a spot yet.
  const center: [number, number] = [latitude ?? 35.6892, longitude ?? 51.389];

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("موقعیت‌یابی روی این دستگاه پشتیبانی نمی‌شود.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.setView([lat, lng], 16, { animate: true });
        onChange(lat, lng);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "اجازه دسترسی به موقعیت را فعال کنید و دوباره بزنید."
            : "موقعیت فعلی دریافت نشد؛ GPS و اینترنت را بررسی کنید."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-surface2" style={{ height: 280 }}>
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
          mapRef.current = myMap;
          setTimeout(() => { try { myMap.invalidateSize(); } catch {} }, 250);
          setTimeout(() => { try { myMap.invalidateSize(); } catch {} }, 800);
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
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="absolute z-[500] bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-surface/95 border border-copper px-3 py-2 text-xs font-bold text-copper shadow-lg disabled:opacity-60"
      >
        {locating ? <LoaderCircle size={15} className="animate-spin" /> : <Crosshair size={15} />}
        {locating ? "در حال یافتن..." : "موقعیت فعلی من"}
      </button>
      {locationError && (
        <p className="absolute z-[500] bottom-14 right-3 left-3 rounded-lg bg-danger/95 px-3 py-2 text-[10px] text-white shadow-lg">
          {locationError}
        </p>
      )}
    </div>
  );
}
