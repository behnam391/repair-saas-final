import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const campaigns = await db.adBanner.findMany({
    where: {
      active: true,
      displayType: "LANDING",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, imageUrl: true, linkUrl: true, title: true, description: true, ctaLabel: true },
  });
  return NextResponse.json({ campaigns }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
