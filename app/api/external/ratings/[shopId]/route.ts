import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireExternalScope, ExternalAuthError } from "@/lib/external-auth";

export const dynamic = "force-dynamic";

// GET /api/external/ratings/:shopId
// Header required: X-API-Key with the "ratings" scope granted.
export async function GET(req: NextRequest, { params }: { params: { shopId: string } }) {
  try {
    await requireExternalScope(req, "ratings");
    const ratings = await db.rating.findMany({ where: { shopId: params.shopId }, select: { stars: true, comment: true, createdAt: true } });
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
    return NextResponse.json({ shopId: params.shopId, count: ratings.length, average: avg, ratings });
  } catch (e) {
    if (e instanceof ExternalAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
