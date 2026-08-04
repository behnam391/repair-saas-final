import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer/shops?province=&city=&q= — customer-panel directory of
// repair shops. Intentionally cross-tenant (like /api/market and
// /api/rankings): a customer browsing shops is supposed to see every
// active shop nationwide. Only public-safe fields are returned. Includes
// each shop's rating aggregate plus whether THIS customer already rated
// it (to switch the button to "ویرایش امتیاز" in the UI).
export async function GET(req: NextRequest) {
  try {
    const { customerId } = await requireCustomer();
    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province");
    const city = searchParams.get("city");
    const q = searchParams.get("q");

    const shops = await db.shop.findMany({
      where: {
        active: true,
        type: { in: ["REPAIR", "BOTH"] }, // only shops that actually repair
        ...(province ? { province } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        // city is free-text on Shop.address in many records; match either
        ...(city ? { OR: [{ address: { contains: city } }, { province: { contains: city } }] } : {}),
      },
      select: {
        id: true, name: true, address: true, phone: true, landlinePhone: true,
        province: true, verificationLevel: true, latitude: true, longitude: true,
        specialties: true,
        ratings: { select: { stars: true, platformCustomerId: true } },
      },
      take: 200,
    });

    const result = shops
      .map((s) => {
        const count = s.ratings.length;
        const avg = count ? s.ratings.reduce((sum, r) => sum + r.stars, 0) / count : 0;
        return {
          id: s.id, name: s.name, address: s.address, phone: s.phone,
          landlinePhone: s.landlinePhone, province: s.province,
          verificationLevel: s.verificationLevel, latitude: s.latitude, longitude: s.longitude,
          specialties: s.specialties,
          ratingCount: count,
          avgRating: Math.round(avg * 10) / 10,
          myRating: s.ratings.find((r) => r.platformCustomerId === customerId)?.stars ?? null,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount);

    return NextResponse.json({ shops: result });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
