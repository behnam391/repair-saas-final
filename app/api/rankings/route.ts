import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/rankings?province=... — public, no login. Aggregates average
// rating + count per shop, optionally filtered by province, sorted best
// first. Shops need at least 3 ratings to appear (avoids one lucky/angry
// review dominating the list).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const province = searchParams.get("province");

  const shops = await db.shop.findMany({
    where: { active: true, ...(province ? { province } : {}) },
    select: {
      id: true, name: true, province: true, address: true,
      ratings: { select: { stars: true } },
    },
  });

  const ranked = shops
    .map((s) => ({
      id: s.id, name: s.name, province: s.province, address: s.address,
      ratingCount: s.ratings.length,
      avgRating: s.ratings.length ? s.ratings.reduce((sum, r) => sum + r.stars, 0) / s.ratings.length : 0,
    }))
    .filter((s) => s.ratingCount >= 3)
    .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount)
    .slice(0, 50);

  return NextResponse.json({ shops: ranked });
}
