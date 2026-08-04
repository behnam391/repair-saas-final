import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/platform-info — public, no auth. Deliberately exposes only
// non-sensitive fields — never Kavenegar/Zarinpal/SMTP secrets. The Neshan
// key is safe to include here: it's a client-side map-rendering key (like
// a browser-restricted Google Maps JS key), not a server secret.
export async function GET() {
  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  const s = settings as any;
  return NextResponse.json({
    guideUrl: settings?.guideUrl ?? null,
    aboutUsContent: settings?.aboutUsContent ?? null,
    neshanApiKey: settings?.neshanApiKey ?? null,
    // Enamad seal identifiers — public by design (they appear in the seal
    // markup on the public site), so safe to expose here.
    enamadId: s?.enamadId ?? null,
    enamadCode: s?.enamadCode ?? null,
  });
}
