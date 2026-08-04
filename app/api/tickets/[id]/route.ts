import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { sendSms, readyForPickupMessage } from "@/lib/sms";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TransitionSchema = z.object({
  action: z.enum(["start", "refer", "submit-for-approval", "approve-cost", "send-back", "ready", "deliver"]),
  targetLane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]).optional(), // required for "refer"
  note: z.string().optional(),
  estimatedCost: z.number().int().optional(), // set when marking ready, sent in the SMS
  includeCardInSms: z.boolean().optional(),
  technicianReportedCost: z.number().int().optional(), // "submit-for-approval"
  approvedCost: z.number().int().optional(),            // "approve-cost"
  technicianWage: z.number().int().optional(),          // "approve-cost"
});

// PATCH /api/tickets/:id — the single endpoint that drives the whole
// multi-specialty workflow. Every transition is written to TicketHistory,
// which is what powers the stamped-timeline view in the UI.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId, name, role } = await requireSession();
    const body = TransitionSchema.parse(await req.json());

    // Always re-fetch scoped to shopId — never trust the id alone.
    const ticket = await db.ticket.findFirst({ where: { id: params.id, shopId } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    let updated;

    switch (body.action) {
      case "submit-for-approval": {
        // Technician has worked the ticket, used some parts (already logged
        // via TicketPart at invoice time or noted here), and proposes a
        // final price. This does NOT go to the customer yet — the manager
        // reviews first, so labor/parts math never leaks to the customer
        // by accident.
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "AWAITING_APPROVAL",
            technicianReportedCost: body.technicianReportedCost,
            technicianNote: body.note,
            history: {
              create: {
                lane: ticket.lane, action: "ارسال هزینه برای تأیید مدیر", techId: userId,
                note: body.technicianReportedCost ? `مبلغ پیشنهادی: ${body.technicianReportedCost.toLocaleString("fa-IR")} تومان${body.note ? " — " + body.note : ""}` : body.note,
              },
            },
          },
        });

        // Notify every OWNER of this shop that a ticket needs approval.
        const owners = await db.user.findMany({ where: { shopId, role: "OWNER" }, select: { id: true } });
        for (const o of owners) {
          await notifyUser(o.id, "هزینه تعمیر منتظر تأیید شماست", `تیکت #${ticket.no} — ${ticket.deviceModel} توسط ${name} آماده بررسی است.`, "/tickets");
        }
        break;
      }

      case "approve-cost": {
        // Manager-only: confirm the final price (can adjust it) and set
        // the technician's wage for this repair — this is what keeps
        // labor cost, parts cost, and shop profit from getting mixed up
        // later at invoice time.
        requireRole(role, ["OWNER"]);
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "IN_PROGRESS",
            estimatedCost: body.approvedCost ?? ticket.technicianReportedCost ?? ticket.estimatedCost,
            technicianWage: body.technicianWage,
            history: {
              create: {
                lane: ticket.lane, action: "هزینه توسط مدیر تأیید شد", techId: userId,
                note: body.approvedCost ? `مبلغ نهایی تأییدشده: ${body.approvedCost.toLocaleString("fa-IR")} تومان` : undefined,
              },
            },
          },
        });
        break;
      }

      case "send-back": {
        // Manager rejects the proposed cost / wants changes — back to the
        // technician with a note, ticket keeps its lane and assignment.
        requireRole(role, ["OWNER"]);
        updated = await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "IN_PROGRESS",
            history: { create: { lane: ticket.lane, action: "بازگشت برای اصلاح", techId: userId, note: body.note } },
          },
        });
        if (ticket.assignedToId) {
          await notifyUser(ticket.assignedToId, "نیاز به اصلاح هزینه", `مدیر برای تیکت #${ticket.no} درخواست اصلاح داد${body.note ? ": " + body.note : "."}`, "/tickets");
        }
        break;
      }

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
          include: { customer: true, shop: true },
        });

        try {
          const t = updated as any;
          const origin = req.nextUrl.origin;
          await sendSms(
            t.customer.phone,
            `${t.shop.name}\nممنون از اعتماد شما! لطفاً با کلیک روی لینک زیر، تجربه‌تان از تعمیر را با یک امتیاز ثبت کنید:\n${origin}/rate/${t.id}`
          );
        } catch (smsErr) {
          console.error("[sms] failed to send rating link", smsErr);
        }
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
