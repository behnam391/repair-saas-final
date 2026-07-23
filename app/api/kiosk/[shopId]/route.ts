import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  deviceModel: z.string().min(1),
  imei: z.string().optional(),
  issueDescription: z.string().min(1),
  devicePasscode: z.string().optional(),
  devicePasscodeType: z.enum(["PIN", "PASSWORD", "PATTERN"]).optional(),
});

// GET /api/kiosk/:shopId — public shop name lookup, so the kiosk page can
// greet the customer by shop name without exposing anything else.
// With ?intake=<id>, also returns that intake's status (scoped to this shop)
// so the customer's phone can live-track approval after submitting.
export async function GET(req: NextRequest, { params }: { params: { shopId: string } }) {
  const shop = await db.shop.findUnique({ where: { id: params.shopId }, select: { name: true, active: true } });
  if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const intakeId = req.nextUrl.searchParams.get("intake");
  if (intakeId) {
    const intake = await db.pendingIntake.findFirst({
      where: { id: intakeId, shopId: params.shopId },
      select: { status: true },
    });
    return NextResponse.json({ shopName: shop.name, intakeStatus: intake?.status ?? null });
  }

  return NextResponse.json({ shopName: shop.name });
}

// POST /api/kiosk/:shopId — public, no auth. Creates a PendingIntake that
// a staff member must review and approve before it becomes a real ticket.
export async function POST(req: NextRequest, { params }: { params: { shopId: string } }) {
  try {
    const shop = await db.shop.findUnique({ where: { id: params.shopId } });
    if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = Schema.parse(await req.json());
    const intake = await db.pendingIntake.create({ data: { shopId: shop.id, ...body } });

    // Ring the bell for every active staff member of this shop — QR intakes
    // used to arrive silently and sit unseen in the pending list.
    try {
      const users = await db.user.findMany({ where: { shopId: shop.id, active: true }, select: { id: true } });
      if (users.length) {
        await db.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            title: "🔳 پذیرش QR جدید",
            message: `${body.customerName} — ${body.deviceModel}`,
            link: "/pending-intakes",
          })),
        });
      }
    } catch (e) {
      console.error("[kiosk] notification failed", e);
    }

    return NextResponse.json({ intake }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
