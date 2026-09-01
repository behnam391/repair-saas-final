"use client";
import { useEffect, useState } from "react";
import EnamadImage from "./EnamadImage";
import { enamadQuery, PEYVO_ENAMAD } from "@/lib/enamad";

export default function EnamadBadge({ className = "" }: { className?: string }) {
  const [config, setConfig] = useState<{ id: string; code: string }>(PEYVO_ENAMAD);
  useEffect(() => { fetch("/api/platform-info").then((r) => r.json()).then((data) => setConfig({ id: data.enamadId || PEYVO_ENAMAD.id, code: data.enamadCode || PEYVO_ENAMAD.code })).catch(() => undefined); }, []);
  const query = enamadQuery(config.id, config.code);
  return <div className={`flex justify-center ${className}`}><a referrerPolicy="origin" target="_blank" href={`https://trustseal.enamad.ir/?${query}`} aria-label="مشاهده اعتبار نماد اعتماد الکترونیکی پیوو"><EnamadImage id={config.id} code={config.code} width={110} height={120} /></a></div>;
}
