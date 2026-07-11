import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { sendSms, readyForPickupMessage } from "@/lib/sms";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TransitionSchema = z.object({
  action: z.enum(["start", "refer", "ready", "deliver"]),
  targetLane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]).optional(), // required for "refer"
  note: z.string().optional(),
  estimatedCost: z.number().int().optional(), // set when marking ready, sent in the SMS
  includeCardInSms: z.boolean().optional(),
});

// PATCH /api/tickets/:id — the single endpoint that drives the whole
// multi-specialty workflow. Every transition is written to TicketHistory,
// which is what powers the stamped-timeline view in the UI.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId, name } = await requireSession();
    const body = TransitionSchema.parse(await req.json());

    // Always re-fetch scoped to shopId — never trust the id alone.
    const ticket = await db.ticket.findFirst({ where: { id: params.id, shopId } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    let updated;

    switch (body.action) {
      case "start": {
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "IN_PROGRESS",
            assignedToId: userId,
            history: { create: { lane: ticket.lane, action: "ادامه کار", techId: userId, note: body.note } },
          },
        });
        break;
      }

      case "refer": {
        if (!body.targetLane) {
          return NextResponse.json({ error: "target_lane_required" }, { status: 400 });
        }
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            lane: body.targetLane,
            status: "PENDING",
            assignedToId: null,
            history: {
              create: {
                lane: body.targetLane,
                action: `ارجاع به ${laneLabel(body.targetLane)}`,
                techId: userId,
                note: body.note,
              },
            },
          },
        });
        break;
      }

      case "ready": {
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            lane: "READY",
            status: "READY",
            estimatedCost: body.estimatedCost ?? ticket.estimatedCost,
            history: { create: { lane: "READY", action: "آماده تحویل", techId: userId, note: body.note } },
          },
          include: { customer: true, shop: true },
        });

        // Fire the automated SMS — this is the core promise of the product.
        try {
          const t = updated as any;
          await sendSms(
            t.customer.phone,
            readyForPickupMessage(t.shop.name, t.customer.name, t.no, {
              price: t.estimatedCost,
              shopPhone: t.shop.phone,
              includeCard: body.includeCardInSms,
              cardNumber: t.shop.bankCardNumber,
            })
          );
        } catch (smsErr) {
          // Don't fail the whole request if SMS delivery fails — log and continue.
          console.error("[sms] failed to notify customer", smsErr);
        }
        break;
      }

      case "deliver": {
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            history: { create: { lane: ticket.lane, action: "تحویل داده شد", techId: userId } },
          },
        });
        break;
      }
    }

    return NextResponse.json({ ticket: updated });
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
