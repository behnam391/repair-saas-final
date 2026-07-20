import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  shopId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// GET /api/customer/rate — this customer's own direct ratings.
export async function GET() {
  try {
    const { customerId } = await requireCustomer();
    const ratings = await db.rating.findMany({
      where: { platformCustomerId: customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, stars: true, comment: true, createdAt: true,
        shop: { select: { id: true, name: true, province: true } },
      },
    });
    return NextResponse.json({ ratings });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/customer/rate — submit or update a direct shop rating from the
// customer panel. One direct rating per (customer, shop): rating the same
// shop again just updates the existing row (so nobody can spam a shop's
// average from one account). Separate from ticket-based SMS ratings, which
// carry a ticketId instead of platformCustomerId.
export async function POST(req: NextRequest) {
  try {
    const { customerId, phone } = await requireCustomer();
    const { shopId, stars, comment } = Schema.parse(await req.json());

    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { id: true, active: true } });
    if (!shop || !shop.active) return NextResponse.json({ error: "shop_not_found" }, { status: 404 });

    const existing = await db.rating.findFirst({
      where: { platformCustomerId: customerId, shopId },
    });

    const rating = existing
      ? await db.rating.update({
          where: { id: existing.id },
          data: { stars, comment: comment ?? null },
        })
      : await db.rating.create({
          data: { shopId, platformCustomerId: customerId, stars, comment, customerPhone: phone },
        });

    return NextResponse.json({ rating, updated: !!existing }, { status: existing ? 200 : 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
