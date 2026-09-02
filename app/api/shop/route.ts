import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { preprocessPhone, preprocessDigits } from "@/lib/phone";
import { serializeServiceCategories } from "@/lib/device-category";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(["REPAIR", "DEALER", "BOTH"]).optional(),
  businessSize: z.enum(["SOLO", "TEAM", "ENTERPRISE"]).optional(),
  serviceCategories: z.array(z.enum(["MOBILE", "COMPUTER"])).min(1).optional(),
  address: z.string().optional(),
  // Digits only, Latin only: the shop phone becomes a `tel:` link and an SMS
  // destination, and a card number typed as ۶۰۳۷… is not a card number at
  // all — the payout would simply fail. See lib/phone.ts.
  phone: z.preprocess(preprocessPhone, z.string().optional()),
  bankCardNumber: z.preprocess(preprocessDigits, z.string().optional()),
  bankAccountNumber: z.preprocess(preprocessDigits, z.string().optional()),
  landlinePhone: z.preprocess(preprocessDigits, z.string().optional()),
  province: z.string().optional(),
  supportAccessEnabled: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const shop = await db.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: {
        id: true, name: true, address: true, phone: true, plan: true, planExpiresAt: true, type: true, bankCardNumber: true, bankAccountNumber: true,
        landlinePhone: true, businessSize: true, specialties: true, serviceCategories: true, verificationLevel: true, verificationRequestedAt: true,
        latitude: true, longitude: true, province: true, taxPercent: true,
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
    const { serviceCategories, ...rest } = body;
    const shop = await db.shop.update({
      where: { id: shopId },
      data: { ...rest, ...(serviceCategories ? { serviceCategories: serializeServiceCategories(serviceCategories) } : {}) },
    });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", message: "یکی از اطلاعات فروشگاه معتبر نیست" }, { status: 400 });
    console.error("[shop/PATCH]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
