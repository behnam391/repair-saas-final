import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  partnershipId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  deviceModel: z.string().optional(),
  issueNote: z.string().optional(),
  suggestedLane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]).optional(),
  commissionType: z.enum(["PERCENT", "FLAT"]).optional(),
  commissionValue: z.number().int().min(0).optional(),
});

// GET /api/collaboration/referrals — every referral involving my shop,
// sent or received. The page splits these into "sent" / "received".
export async function GET() {
  try {
    const { shopId } = await requireSession();
    const referrals = await (db as any).shopReferral.findMany({
      where: { OR: [{ fromShopId: shopId }, { toShopId: shopId }] },
      include: {
        fromShop: { select: { id: true, name: true } },
        toShop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ referrals });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/collaboration/referrals — hand a customer/device off to a
// partner shop. Requires an ACCEPTED ShopPartnership between the two
// shops — referrals only flow through an established collaboration link,
// never to an arbitrary shop.
export async function POST(req: NextRequest) {
  try {
    const { shopId, name } = await requireSession();
    const body = CreateSchema.parse(await req.json());

    const partnership = await (db as any).shopPartnership.findFirst({
      where: { id: body.partnershipId, OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] },
    });
    if (!partnership) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (partnership.status !== "ACCEPTED") {
      return NextResponse.json({ message: "فقط با همکاران فعال می‌توانید مشتری ارجاع دهید" }, { status: 400 });
    }

    const toShopId = partnership.requestedByShopId === shopId ? partnership.targetShopId : partnership.requestedByShopId;

    const referral = await (db as any).shopReferral.create({
      data: {
        partnershipId: partnership.id,
        fromShopId: shopId,
        toShopId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        deviceModel: body.deviceModel,
        issueNote: body.issueNote,
        suggestedLane: body.suggestedLane,
        commissionType: body.commissionType,
        commissionValue: body.commissionValue,
        createdByName: name,
      },
    });

    const myShop = await db.shop.findUnique({ where: { id: shopId }, select: { name: true } });
    const toUsers = await db.user.findMany({ where: { shopId: toShopId, active: true }, select: { id: true } });
    for (const u of toUsers) {
      await notifyUser(u.id, "ارجاع مشتری جدید", `مغازه «${myShop?.name}» یک مشتری برای شما ارجاع داد: ${body.customerName}`, "/collaboration");
    }

    return NextResponse.json({ referral }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
