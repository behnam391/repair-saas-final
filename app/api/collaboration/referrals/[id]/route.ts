import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  action: z.enum(["accept", "decline", "complete", "mark-paid"]),
  commissionAmount: z.number().int().min(0).optional(), // required for "complete"
});

function laneLabel(lane: string) {
  return { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی (برد/هارد)" }[lane] ?? lane;
}

// PATCH /api/collaboration/referrals/:id
// - "accept" (receiving shop only): opens a real Customer + Ticket in the
//   receiving shop, exactly like a normal intake, and links it back.
// - "decline" (receiving shop only)
// - "complete" (receiving shop only): records the final commission owed.
// - "mark-paid" (either shop): settles the commission bookkeeping —
//   purely a record, no real money moves through the app.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId, name } = await requireSession();
    const body = ActionSchema.parse(await req.json());

    const referral = await (db as any).shopReferral.findFirst({
      where: { id: params.id, OR: [{ fromShopId: shopId }, { toShopId: shopId }] },
    });
    if (!referral) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const isReceivingShop = referral.toShopId === shopId;
    const otherShopId = isReceivingShop ? referral.fromShopId : referral.toShopId;
    const myShop = await db.shop.findUnique({ where: { id: shopId }, select: { name: true } });

    if ((body.action === "accept" || body.action === "decline") && !isReceivingShop) {
      return NextResponse.json({ message: "فقط مغازه دریافت‌کننده می‌تواند این ارجاع را بپذیرد یا رد کند" }, { status: 403 });
    }
    if ((body.action === "accept" || body.action === "decline") && referral.status !== "SENT") {
      return NextResponse.json({ message: "قبلاً به این ارجاع پاسخ داده شده" }, { status: 400 });
    }
    if (body.action === "complete" && !isReceivingShop) {
      return NextResponse.json({ message: "فقط مغازه دریافت‌کننده می‌تواند تکمیل را ثبت کند" }, { status: 403 });
    }
    if (body.action === "complete" && referral.status !== "ACCEPTED") {
      return NextResponse.json({ message: "فقط ارجاع پذیرفته‌شده قابل تکمیل است" }, { status: 400 });
    }
    if (body.action === "mark-paid" && referral.commissionStatus !== "PENDING") {
      return NextResponse.json({ message: "پورسانتی در انتظار پرداخت برای این ارجاع نیست" }, { status: 400 });
    }

    let updated;

    if (body.action === "accept") {
      const toShop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
      if (!toShop.active) {
        return NextResponse.json({ message: "حساب مغازه شما موقتاً غیرفعال است" }, { status: 403 });
      }
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const countThisMonth = await db.ticket.count({ where: { shopId, createdAt: { gte: startOfMonth } } });
      if (countThisMonth >= toShop.monthlyQuota) {
        return NextResponse.json({ message: "سهمیه این ماه شما تمام شده — برای پذیرش ارجاع، اشتراک را ارتقا دهید" }, { status: 402 });
      }

      const lane = referral.suggestedLane ?? "HARDWARE";
      const result = await db.$transaction(async (tx) => {
        let customer = await tx.customer.findFirst({ where: { shopId, phone: referral.customerPhone } });
        if (!customer) {
          customer = await tx.customer.create({ data: { shopId, name: referral.customerName, phone: referral.customerPhone } });
        }
        const last = await tx.ticket.findFirst({ where: { shopId }, orderBy: { no: "desc" }, select: { no: true } });
        const nextNo = (last?.no ?? 1000) + 1;
        const ticket = await tx.ticket.create({
          data: {
            shopId,
            no: nextNo,
            customerId: customer.id,
            deviceModel: referral.deviceModel || "نامشخص",
            issueInitial: referral.issueNote || "ارجاع از مغازه همکار",
            lane,
            status: "PENDING",
            history: {
              create: [
                { lane, action: `پذیرش ارجاع از مغازه همکار (${myShop?.name ?? ""})`, techId: userId, note: referral.issueNote ?? undefined },
                { lane, action: `ارجاع به ${laneLabel(lane)}`, techId: userId },
              ],
            },
          },
        });
        return ticket;
      });

      updated = await (db as any).shopReferral.update({
        where: { id: referral.id },
        data: { status: "ACCEPTED", resultTicketId: result.id, respondedAt: new Date() },
      });
    } else if (body.action === "decline") {
      updated = await (db as any).shopReferral.update({
        where: { id: referral.id },
        data: { status: "DECLINED", respondedAt: new Date() },
      });
    } else if (body.action === "complete") {
      const amount = body.commissionAmount ?? 0;
      updated = await (db as any).shopReferral.update({
        where: { id: referral.id },
        data: {
          status: "COMPLETED",
          commissionAmount: amount,
          commissionStatus: amount > 0 ? "PENDING" : "NONE",
          completedAt: new Date(),
        },
      });
    } else {
      updated = await (db as any).shopReferral.update({
        where: { id: referral.id },
        data: { commissionStatus: "PAID", commissionPaidAt: new Date() },
      });
    }

    const otherUsers = await db.user.findMany({ where: { shopId: otherShopId, active: true }, select: { id: true } });
    const verbLabel: Record<string, string> = {
      accept: "پذیرفت", decline: "رد کرد", complete: "تکمیل و پورسانت را ثبت کرد", "mark-paid": "پرداخت پورسانت را ثبت کرد",
    };
    for (const u of otherUsers) {
      await notifyUser(u.id, "به‌روزرسانی ارجاع همکاری", `مغازه «${myShop?.name}» ارجاع مربوط به «${referral.customerName}» را ${verbLabel[body.action]}.`, "/collaboration");
    }

    return NextResponse.json({ referral: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
