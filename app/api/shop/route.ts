import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  bankCardNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
});

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const shop = await db.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: {
        id: true, name: true, address: true, phone: true, plan: true, type: true, bankCardNumber: true, bankAccountNumber: true,
        landlinePhone: true, businessSize: true, specialties: true, verificationLevel: true, verificationRequestedAt: true,
      },
    });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);
    const body = UpdateSchema.parse(await req.json());
    const shop = await db.shop.update({ where: { id: shopId }, data: body });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
