import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer/shops?province=&city=&query=
export async function GET(req: NextRequest) {
  try {
    await requireCustomerSession();
    const { searchParams } = req.nextUrl;
    const province = searchParams.get("province");
    const query = searchParams.get("query");

    const shops = await db.shop.findMany({
      where: {
        active: true,
        ...(province ? { province } : {}),
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      },
      select: {
        id: true, name: true, type: true, address: true, province: true, phone: true,
        verificationLevel: true, latitude: true, longitude: true,
        ratings: { select: { stars: true } },
      },
      take: 100,
    });

    const withRating = shops
      .map((s) => ({
        id: s.id, name: s.name, type: s.type, address: s.address, province: s.province, phone: s.phone,
        verificationLevel: s.verificationLevel, latitude: s.latitude, longitude: s.longitude,
        ratingCount: s.ratings.length,
        ratingAvg: s.ratings.length ? s.ratings.reduce((sum, r) => sum + r.stars, 0) / s.ratings.length : 0,
      }))
      .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);

    return NextResponse.json({ shops: withRating });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
