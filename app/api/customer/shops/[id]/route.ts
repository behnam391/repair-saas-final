import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { customerId } = await requireCustomerSession();

    const shop = await db.shop.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, type: true, address: true, province: true, phone: true, landlinePhone: true,
        verificationLevel: true, latitude: true, longitude: true,
        ratings: { select: { stars: true, comment: true, createdAt: true, platformCustomerId: true }, orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const ratingCount = shop.ratings.length;
    const ratingAvg = ratingCount ? shop.ratings.reduce((s, r) => s + r.stars, 0) / ratingCount : 0;
    const myRating = shop.ratings.find((r) => r.platformCustomerId === customerId) ?? null;

    return NextResponse.json({
      shop: { ...shop, ratings: undefined, ratingAvg, ratingCount, reviews: shop.ratings.map((r) => ({ stars: r.stars, comment: r.comment, createdAt: r.createdAt })) },
      myRating,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
