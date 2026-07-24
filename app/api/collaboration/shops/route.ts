import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/collaboration/shops?q=&province= — directory of OTHER active
// shops on the platform, for picking a partner to send a collaboration
// request to. Any signed-in staff member can browse this (not owner-only)
// since technicians are the ones expected to initiate collaboration.
// Excludes the caller's own shop and only exposes public-safe fields.
export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const province = searchParams.get("province");

    const [shops, existingLinks] = await Promise.all([
      db.shop.findMany({
        where: {
          active: true,
          id: { not: shopId },
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
          ...(province ? { province } : {}),
        },
        select: {
          id: true, name: true, address: true, province: true, type: true,
          specialties: true, verificationLevel: true,
        },
        orderBy: { name: "asc" },
        take: 100,
      }),
      // So the UI can show "already partnered / request pending" instead
      // of letting staff send a duplicate request.
      (db as any).shopPartnership.findMany({
        where: { OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] },
        select: { requestedByShopId: true, targetShopId: true, status: true },
      }),
    ]);

    const linkByShop: Record<string, string> = {};
    for (const l of existingLinks as any[]) {
      const otherId = l.requestedByShopId === shopId ? l.targetShopId : l.requestedByShopId;
      linkByShop[otherId] = l.status;
    }

    const result = shops.map((s) => ({ ...s, partnershipStatus: linkByShop[s.id] ?? null }));
    return NextResponse.json({ shops: result });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
