import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateTicketSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  deviceModel: z.string().min(1),
  imei: z.string().optional(),
  issueInitial: z.string().min(1),
  lane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]),
  estimatedCost: z.number().int().optional(),
  devicePasscode: z.string().optional(),
  devicePasscodeType: z.enum(["PIN", "PASSWORD", "PATTERN"]).optional(),
  customerDamageNotes: z.string().optional(),
  receiptAck: z.enum(["SHOP_PRINTED_SIGNED", "SITE_PRINTED_SIGNED", "NO_SIGNATURE"]).optional(),
});

// GET /api/tickets?lane=HARDWARE&status=PENDING
// Always scoped to the signed-in user's shop. Specialist technicians
// (HARDWARE/SOFTWARE/BOARD) only see tickets that are theirs — either
// already assigned to them, or still unassigned and sitting in their own
// lane waiting to be picked up. Owners and front-desk staff see everything,
// since they coordinate across the whole shop.
export async function GET(req: NextRequest) {
  try {
    const { shopId, userId, role } = await requireSession();
    const { searchParams } = new URL(req.url);
    const lane = searchParams.get("lane");
    const status = searchParams.get("status");

    const isSpecialist = ["HARDWARE", "SOFTWARE", "BOARD"].includes(role);

    const tickets = await db.ticket.findMany({
      where: {
        shopId,
        ...(lane ? { lane: lane as any } : {}),
        // The active board (this endpoint's main use, from tickets/page.tsx)
        // only ever asks for lane/no status filter — so by default, hide
        // tickets that already left the workflow (delivered or cancelled).
        // Without this, a delivered ticket's lane stays "READY" forever
        // and it would never disappear from the "آماده تحویل" column.
        // Passing an explicit ?status= (e.g. the history/search page)
        // always wins and is never restricted here.
        ...(status ? { status: status as any } : { status: { notIn: ["DELIVERED", "CANCELLED"] } }),
        ...(isSpecialist
          ? { OR: [{ assignedToId: userId }, { assignedToId: null, lane: role as any }] }
          : {}),
      },
      include: {
        customer: true,
        assignedTo: true,
        invoice: true,
        history: { orderBy: { createdAt: "asc" }, include: { tech: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tickets });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/tickets — device intake.
export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    const body = CreateTicketSchema.parse(await req.json());

    // Enforce the shop's monthly intake quota (applies to every plan;
    // paid plans just get a much higher monthlyQuota set at checkout).
    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
    if (!shop.active) {
      return NextResponse.json(
        { error: "shop_suspended", message: "حساب این مغازه توسط مدیریت سیستم موقتاً غیرفعال شده است." },
        { status: 403 }
      );
    }
    {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const countThisMonth = await db.ticket.count({
        where: { shopId, createdAt: { gte: startOfMonth } },
      });
      if (countThisMonth >= shop.monthlyQuota) {
        return NextResponse.json(
          { error: "quota_exceeded", message: "سهمیه این ماه تمام شده. برای ادامه، اشتراک خود را ارتقا دهید." },
          { status: 402 }
        );
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Find-or-create the customer by phone within this shop.
      let customer = await tx.customer.findFirst({
        where: { shopId, phone: body.customerPhone },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: { shopId, name: body.customerName, phone: body.customerPhone },
        });
      }

      // Ticket numbers are sequential per-shop, not global.
      const last = await tx.ticket.findFirst({
        where: { shopId },
        orderBy: { no: "desc" },
        select: { no: true },
      });
      const nextNo = (last?.no ?? 1000) + 1;

      const ticket = await tx.ticket.create({
        data: {
          shopId,
          no: nextNo,
          customerId: customer.id,
          deviceModel: body.deviceModel,
          imei: body.imei,
          issueInitial: body.issueInitial,
          lane: body.lane,
          status: "PENDING",
          estimatedCost: body.estimatedCost,
          devicePasscode: body.devicePasscode,
          devicePasscodeType: body.devicePasscodeType,
          customerDamageNotes: body.customerDamageNotes,
          receiptAck: body.receiptAck,
          history: {
            create: [
              { lane: body.lane, action: "پذیرش دستگاه", techId: userId, note: body.issueInitial },
              { lane: body.lane, action: `ارجاع به ${laneLabel(body.lane)}`, techId: userId },
            ],
          },
        },
        include: { customer: true, history: true },
      });

      return ticket;
    });

    return NextResponse.json({ ticket: result }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

function laneLabel(lane: string) {
  return { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی (برد/هارد)" }[lane] ?? lane;
}
