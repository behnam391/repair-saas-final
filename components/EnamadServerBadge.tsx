import { db } from "@/lib/db";

export default async function EnamadServerBadge() {
  let settings: { enamadId: string | null; enamadCode: string | null } | null = null;
  try { settings = await db.platformSettings.findUnique({ where: { id: "singleton" }, select: { enamadId: true, enamadCode: true } }); } catch { return null; }
  const id = settings?.enamadId?.trim();
  const code = settings?.enamadCode?.trim();
  if (!id || !code) return null;
  const query = `id=${encodeURIComponent(id)}&Code=${encodeURIComponent(code)}`;
  return <div className="enamad-prominent"><a referrerPolicy="origin" target="_blank" href={`https://trustseal.enamad.ir/?${query}`} aria-label="مشاهده اعتبار نماد اعتماد الکترونیکی پیوو"><img src="/api/enamad-logo" alt="نماد اعتماد الکترونیکی پیوو" width="125" height="136" /></a></div>;
}
