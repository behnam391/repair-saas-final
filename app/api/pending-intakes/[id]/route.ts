import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  decision: z.enum(["approve", "reject"]),
  lane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]).optional(), // required for approve
  // Optional shopkeeper-edited customer name (fix a typo before it lands in
  // the directory). Falls back to what the customer typed at the kiosk.
  customerName: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId } = await requireSession();
    const intake = await db.pendingIntake.findFirst({ where: { id: params.id, shopId, status: "PENDING" } });
    if (!intake) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { decision, lane, customerName } = Schema.parse(await req.json());

    if (decision === "reject") {
      await db.pendingIntake.update({ where: { id: intake.id }, data: { status: "REJECTED" } });
      return NextResponse.json({ ok: true });
    }

    if (!lane) return NextResponse.json({ error: "lane_required" }, { status: 400 });

    const ticket = await db.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({ where: { shopId, phone: intake.customerPhone } });
      if (!customer) {
        customer = await tx.customer.create({
          data: { shopId, name: (customerName?.trim() || intake.customerName), phone: intake.customerPhone },
        });
      }
      const last = await tx.ticket.findFirst({ where: { shopId }, orderBy: { no: "desc" }, select: { no: true } });
      const nextNo = (last?.no ?? 1000) + 1;

      const t = await tx.ticket.create({
        data: {
          shopId, no: nextNo, customerId: customer.id, deviceModel: intake.deviceModel, imei: intake.imei,
          issueInitial: intake.issueDescription, lane, status: "PENDING",
          devicePasscode: intake.devicePasscode, devicePasscodeType: intake.devicePasscodeType,
          history: {
            create: [
              { lane, action: "پذیرش خودکار (اسکن QR توسط مشتری)", techId: userId, note: intake.issueDescription },
              { lane, action: "بررسی و تأیید توسط کارمند", techId: userId },
            ],
          },
        },
      });
      await tx.pendingIntake.update({ where: { id: intake.id }, data: { status: "APPROVED" } });
      return t;
    });

    return NextResponse.json({ ticket });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
