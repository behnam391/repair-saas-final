import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/platform-info — public, no auth. Deliberately exposes only
// non-sensitive fields — never Kavenegar/Zarinpal/SMTP secrets. The Neshan
// key is safe to include here: it's a client-side map-rendering key (like
// a browser-restricted Google Maps JS key), not a server secret.
export async function GET() {
  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    guideUrl: settings?.guideUrl ?? null,
    aboutUsContent: settings?.aboutUsContent ?? null,
    neshanApiKey: settings?.neshanApiKey ?? null,
  });
}
