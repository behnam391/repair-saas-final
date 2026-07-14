import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/platform-info — public, no auth. Deliberately exposes only
// non-sensitive fields (never API keys) so the help link and About page
// can be shown to any visitor.
export async function GET() {
  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    guideUrl: settings?.guideUrl ?? null,
    aboutUsContent: settings?.aboutUsContent ?? null,
  });
}
