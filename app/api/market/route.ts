import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ListingSchema = z.object({
  category: z.enum(["BOARD", "FLASH_FILE", "PART", "EXPERTISE", "OTHER"]),
  title: z.string().min(3),
  description: z.string().min(3),
  deviceModel: z.string().optional(),
  province: z.string().min(1),
  city: z.string().min(1),
  showContact: z.boolean().optional(),
});

// GET /api/market?province=&city=&category=&status=OPEN
// Deliberately NOT scoped to the caller's shopId — this is the nationwide
// board, visible to every signed-in technician regardless of which shop
// they belong to. Authentication is still required (requireSession),
// just not tenant filtering.
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province");
    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const status = searchParams.get("status") ?? "OPEN";

    const listings = await db.marketListing.findMany({
      where: {
        ...(province ? { province } : {}),
        ...(city ? { city } : {}),
        ...(category ? { category: category as any } : {}),
        ...(status !== "ALL" ? { status: status as any } : {}),
      },
      include: {
        author: { select: { name: true, phone: true } },
        shop: { select: { name: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ listings });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/market — post a new nationwide request/offer.
export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    const body = ListingSchema.parse(await req.json());

    const listing = await db.marketListing.create({
      data: { shopId, authorId: userId, ...body },
      include: { author: { select: { name: true, phone: true } } },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
