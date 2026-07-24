import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  action: z.enum(["accept", "reject", "end"]),
});

// PATCH /api/collaboration/partnerships/:id
// - "accept" / "reject": only the shop that RECEIVED the request may act.
// - "end": either side of an already-ACCEPTED partnership may end it.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, name } = await requireSession();
    const { action } = ActionSchema.parse(await req.json());

    const partnership = await (db as any).shopPartnership.findFirst({
      where: { id: params.id, OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] },
    });
    if (!partnership) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const otherShopId = partnership.requestedByShopId === shopId ? partnership.targetShopId : partnership.requestedByShopId;
    const myShop = await db.shop.findUnique({ where: { id: shopId }, select: { name: true } });

    if ((action === "accept" || action === "reject") && partnership.targetShopId !== shopId) {
      return NextResponse.json({ message: "فقط مغازه‌ای که درخواست را دریافت کرده می‌تواند پاسخ دهد" }, { status: 403 });
    }
    if ((action === "accept" || action === "reject") && partnership.status !== "PENDING") {
      return NextResponse.json({ message: "این درخواست قبلاً پاسخ داده شده است" }, { status: 400 });
    }
    if (action === "end" && partnership.status !== "ACCEPTED") {
      return NextResponse.json({ message: "فقط همکاری فعال قابل پایان‌دادن است" }, { status: 400 });
    }

    const newStatus = action === "accept" ? "ACCEPTED" : action === "reject" ? "REJECTED" : "ENDED";
    const updated = await (db as any).shopPartnership.update({
      where: { id: partnership.id },
      data: { status: newStatus, respondedAt: new Date() },
    });

    const otherUsers = await db.user.findMany({ where: { shopId: otherShopId, active: true }, select: { id: true } });
    const verb = action === "accept" ? "پذیرفت" : action === "reject" ? "رد کرد" : "پایان داد";
    for (const u of otherUsers) {
      await notifyUser(u.id, "به‌روزرسانی همکاری", `مغازه «${myShop?.name}» درخواست همکاری را ${verb}.`, "/collaboration");
    }

    return NextResponse.json({ partnership: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
