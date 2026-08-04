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
export async function GET(_req: NextRequest, { params }: { params: { shopId: string } }) {
  const shop = await db.shop.findUnique({ where: { id: params.shopId }, select: { name: true, active: true } });
  if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });
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
    return NextResponse.json({ intake }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
