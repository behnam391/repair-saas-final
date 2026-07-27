"use client";
/**
 * Enamad (نماد اعتماد الکترونیکی) trust seal.
 *
 * IMPORTANT — per Enamad's own instructions: the seal link must NOT carry
 * rel="noopener noreferrer". That strips the referrer, so Enamad can't see
 * the seal is hosted on our real domain and it never shows as verified
 * (and payment gateways require a verified seal). We instead use
 * referrerPolicy="origin", which sends just the origin — enough for Enamad
 * to verify, without leaking the full URL.
 *
 * Renders nothing until the super-admin fills in the id + Code in
 * /superadmin/settings, so it's safe to mount on public pages right now.
 */
import { useEffect, useState } from "react";

export default function EnamadBadge({ className = "" }: { className?: string }) {
  const [cfg, setCfg] = useState<{ id: string | null; code: string | null }>({ id: null, code: null });

  useEffect(() => {
    fetch("/api/platform-info")
      .then((r) => r.json())
      .then((d) => setCfg({ id: d.enamadId ?? null, code: d.enamadCode ?? null }))
      .catch(() => {});
  }, []);

  if (!cfg.id || !cfg.code) return null;

  const q = `id=${encodeURIComponent(cfg.id)}&Code=${encodeURIComponent(cfg.code)}`;

  return (
    <div className={`flex justify-center ${className}`}>
      {/* Do NOT add rel="noopener noreferrer" here — see the note above. */}
      {/* eslint-disable-next-line react/jsx-no-target-blank */}
      <a referrerPolicy="origin" target="_blank" href={`https://trustseal.enamad.ir/?${q}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          referrerPolicy="origin"
          src={`https://trustseal.enamad.ir/logo.aspx?${q}`}
          alt="نماد اعتماد الکترونیکی"
          style={{ cursor: "pointer", maxWidth: 110, height: "auto" }}
        />
      </a>
    </div>
  );
}
