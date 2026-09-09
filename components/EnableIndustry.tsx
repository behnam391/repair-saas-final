"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function EnableIndustry({ industry }: { industry: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <><button disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/industry-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ industry }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.message);
      router.push(`/industry-workspaces/${industry}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط برقرار نشد"); }
    finally { setBusy(false); }
  }}>{busy ? "در حال فعال‌سازی…" : "افزودن این صنف به تعمیرگاه"}</button>{error && <p role="alert">{error}</p>}</>;
}
