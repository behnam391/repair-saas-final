"use client";
import { useEffect, useState } from "react";

export default function EnamadBadge({ className = "" }: { className?: string }) {
  const [config, setConfig] = useState<{ id: string | null; code: string | null }>({ id: null, code: null });
  useEffect(() => { fetch("/api/platform-info").then((r) => r.json()).then((data) => setConfig({ id: data.enamadId || null, code: data.enamadCode || null })).catch(() => undefined); }, []);
  if (!config.id || !config.code) return null;
  const query = `id=${encodeURIComponent(config.id)}&Code=${encodeURIComponent(config.code)}`;
  return <div className={`flex justify-center ${className}`}><a referrerPolicy="origin" target="_blank" href={`https://trustseal.enamad.ir/?${query}`}><img referrerPolicy="origin" src={`https://trustseal.enamad.ir/logo.aspx?${query}`} alt="نماد اعتماد الکترونیکی پیوو" style={{ cursor: "pointer", width: 110, height: 120, objectFit: "contain" }} /></a></div>;
}
