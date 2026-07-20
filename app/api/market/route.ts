import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ListingSchema = z.object({
  listingType: z.enum(["REQUEST", "OFFER"]).default("REQUEST"),
  category: z.enum(["BOARD", "FLASH_FILE", "PART", "EXPERTISE", "OTHER"]),
  title: z.string().min(3),
  description: z.string().min(3),
  deviceModel: z.string().optional(),
  imageUrl: z.string().optional(),
  province: z.string().min(1),
  city: z.string().min(1),
  showContact: z.boolean().optional(),
});

// GET /api/market?province=&city=&category=&status=OPEN&listingType=
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
    const listingType = searchParams.get("listingType");
    const status = searchParams.get("status") ?? "OPEN";

    const listings = await db.marketListing.findMany({
      where: {
        ...(province ? { province } : {}),
        ...(city ? { city } : {}),
        ...(category ? { category: category as any } : {}),
        ...(listingType ? { listingType: listingType as any } : {}),
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

// Very small heuristic: two listings "match" if their titles/device models
// share a meaningful word. Good enough to catch "دنبال LCD سامسونگ A54" vs
// "LCD سامسونگ A54 دارم برای فروش" without needing a real search engine.
function sharesKeyword(a: string, b: string) {
  const normalize = (s: string) => s.toLowerCase().split(/[\s،/]+/).filter((w) => w.length > 2);
  const wordsA = new Set(normalize(a));
  const wordsB = normalize(b);
  return wordsB.some((w) => wordsA.has(w));
}

// POST /api/market — post a new nationwide request/offer. After creating
// the post, we check for opposite-type listings that look like a match
// and notify both sides — this is the "کسی دنبال چیزی است که من دارم"
// feature, implemented as simple keyword matching (not a real search index).
export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    const body = ListingSchema.parse(await req.json());

    const listing = await db.marketListing.create({
      data: { shopId, authorId: userId, ...body, imageUrl: body.imageUrl || null },
      include: { author: { select: { name: true, phone: true } } },
    });

    const oppositeType = body.listingType === "REQUEST" ? "OFFER" : "REQUEST";
    const candidates = await db.marketListing.findMany({
      where: { listingType: oppositeType, status: "OPEN", category: body.category },
      select: { id: true, title: true, deviceModel: true, authorId: true },
      take: 200,
    });

    const searchText = `${body.title} ${body.deviceModel ?? ""}`;
    for (const c of candidates) {
      const candidateText = `${c.title} ${c.deviceModel ?? ""}`;
      if (sharesKeyword(searchText, candidateText)) {
        // Notify the other party that a possible match just appeared.
        await notifyUser(
          c.authorId,
          "یک مورد مشابه پیدا شد",
          `آگهی جدید «${listing.title}» ممکن است با «${c.title}» که شما ثبت کرده‌اید مطابقت داشته باشد.`,
          "/market"
        );
        // Also let the new poster know immediately.
        await notifyUser(
          userId,
          "یک مورد مشابه در بازار هست",
          `آگهی «${c.title}» با آگهی شما «${listing.title}» ممکن است مطابقت داشته باشد.`,
          "/market"
        );
      }
    }

    // ── Market ↔ inventory matching ─────────────────────────────────
    // When someone posts a REQUEST ("دنبال این می‌گردم"), scan OTHER shops'
    // in-stock inventory for items whose name/model shares a keyword with
    // the request, and notify those shops' active staff — "کسی دنبال چیزی
    // است که تو در انبارت داری". Deliberately cross-tenant (only pushes a
    // notification; it reveals nothing about the inventory to the requester
    // until the shop itself chooses to respond).
    if (body.listingType === "REQUEST") {
      const stock = await db.inventoryItem.findMany({
        where: { shopId: { not: shopId }, quantity: { gt: 0 } },
        select: { id: true, name: true, deviceModel: true, shopId: true },
        take: 2000,
      });
      const matchedShopIds = new Set<string>();
      for (const item of stock) {
        if (sharesKeyword(searchText, `${item.name} ${item.deviceModel ?? ""}`)) {
          matchedShopIds.add(item.shopId);
        }
      }
      if (matchedShopIds.size > 0) {
        // Notify each matched shop's active users (owner + staff), capped
        // so one generic request can't flood the whole country.
        const recipients = await db.user.findMany({
          where: { shopId: { in: [...matchedShopIds].slice(0, 30) }, active: true },
          select: { id: true },
        });
        for (const r of recipients.slice(0, 100)) {
          await notifyUser(
            r.id,
            "📦 درخواستی مشابه موجودی انبار شما",
            `در بازار سراسری درخواست «${listing.title}» ثبت شد که با کالای موجود در انبار شما هم‌خوانی دارد — اگر مایلید پاسخ بدهید یا پیام بفرستید.`,
            "/market"
          );
        }
      }
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
