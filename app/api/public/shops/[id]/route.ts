import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/shops/:id — public, no auth. Only non-sensitive fields.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const shop = await db.shop.findUnique({
    where: { id: params.id },
    select: {
      name: true, address: true, phone: true, landlinePhone: true, province: true, type: true,
      verificationLevel: true, latitude: true, longitude: true, active: true,
      ratings: { select: { stars: true } },
    },
  });
  if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ratingCount = shop.ratings.length;
  const ratingAvg = ratingCount ? shop.ratings.reduce((s, r) => s + r.stars, 0) / ratingCount : 0;

  return NextResponse.json({
    shop: {
      name: shop.name, address: shop.address, phone: shop.phone, landlinePhone: shop.landlinePhone,
      province: shop.province, type: shop.type, verificationLevel: shop.verificationLevel,
      latitude: shop.latitude, longitude: shop.longitude, ratingAvg, ratingCount,
    },
  });
}
