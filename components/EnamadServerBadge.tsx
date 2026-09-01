import { db } from "@/lib/db";
import EnamadImage from "./EnamadImage";
import { enamadQuery, PEYVO_ENAMAD } from "@/lib/enamad";

export default async function EnamadServerBadge() {
  let settings: { enamadId: string | null; enamadCode: string | null } | null = null;
  try { settings = await db.platformSettings.findUnique({ where: { id: "singleton" }, select: { enamadId: true, enamadCode: true } }); } catch { settings = null; }
  const id = settings?.enamadId?.trim() || PEYVO_ENAMAD.id;
  const code = settings?.enamadCode?.trim() || PEYVO_ENAMAD.code;
  const query = enamadQuery(id, code);
  return <div className="enamad-prominent"><a referrerPolicy="origin" target="_blank" href={`https://trustseal.enamad.ir/?${query}`} aria-label="مشاهده اعتبار نماد اعتماد الکترونیکی پیوو"><EnamadImage id={id} code={code} /></a></div>;
}
