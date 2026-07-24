import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  targetShopId: z.string().min(1),
  note: z.string().optional(),
});

// GET /api/collaboration/partnerships — every partnership link involving
// my shop, sent or received, any status. The page splits these into
// "active partners" / "pending" / "incoming requests" client-side.
export async function GET() {
  try {
    const { shopId } = await requireSession();
    const partnerships = await (db as any).shopPartnership.findMany({
      where: { OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] },
      include: {
        requestedByShop: { select: { id: true, name: true, province: true, address: true } },
        targetShop: { select: { id: true, name: true, province: true, address: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ partnerships });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/collaboration/partnerships — send a new collaboration request
// to another shop. Open to any signed-in staff member (owner or
// technician) — this is meant to be usable by the people who'll actually
// refer work, not gated behind manager approval.
export async function POST(req: NextRequest) {
  try {
    const { shopId, name } = await requireSession();
    const body = CreateSchema.parse(await req.json());

    if (body.targetShopId === shopId) {
      return NextResponse.json({ message: "نمی‌توانید با مغازه خودتان همکاری ثبت کنید" }, { status: 400 });
    }
    const target = await db.shop.findUnique({ where: { id: body.targetShopId } });
    if (!target || !target.active) {
      return NextResponse.json({ message: "مغازه موردنظر پیدا نشد" }, { status: 404 });
    }

    // Guard against duplicates in EITHER direction — the DB unique
    // constraint only covers one direction, so check both explicitly.
    const existing = await (db as any).shopPartnership.findFirst({
      where: {
        OR: [
          { requestedByShopId: shopId, targetShopId: body.targetShopId },
          { requestedByShopId: body.targetShopId, targetShopId: shopId },
        ],
      },
    });
    if (existing) {
      const msg =
        existing.status === "ACCEPTED" ? "همکاری با این مغازه از قبل فعال است" :
        existing.status === "PENDING" ? "درخواستی بین این دو مغازه قبلاً ثبت شده و در انتظار پاسخ است" :
        "ارتباطی بین این دو مغازه قبلاً ثبت شده — برای درخواست مجدد با پشتیبانی تماس بگیرید";
      return NextResponse.json({ message: msg }, { status: 409 });
    }

    const partnership = await (db as any).shopPartnership.create({
      data: {
        requestedByShopId: shopId,
        targetShopId: body.targetShopId,
        note: body.note,
        createdByName: name,
      },
    });

    // Notify every active user at the target shop.
    const targetUsers = await db.user.findMany({ where: { shopId: body.targetShopId, active: true }, select: { id: true } });
    const myShop = await db.shop.findUnique({ where: { id: shopId }, select: { name: true } });
    for (const u of targetUsers) {
      await notifyUser(u.id, "درخواست همکاری جدید", `مغازه «${myShop?.name}» درخواست همکاری فرستاد.`, "/collaboration");
    }

    return NextResponse.json({ partnership }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
