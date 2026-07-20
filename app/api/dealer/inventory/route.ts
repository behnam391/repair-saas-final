import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function assertDealer(shopId: string) {
  const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  if (shop.type !== "DEALER" && shop.type !== "BOTH") {
    throw new Error("not_a_dealer");
  }
}

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const items = await db.dealerInventory.findMany({ where: { shopId }, orderBy: { acquiredAt: "desc" } });
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const CreateSchema = z.object({
  imei: z.string().optional(),
  deviceModel: z.string().min(1),
  condition: z.enum(["WORKING", "DEFECTIVE", "FOR_PARTS"]).default("WORKING"),
  purchasePrice: z.number().int().min(0),
  askingPrice: z.number().int().min(0).optional(),
  sourceName: z.string().optional(),
  sourcePhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    await assertDealer(shopId);

    const body = CreateSchema.parse(await req.json());
    const item = await db.dealerInventory.create({ data: { shopId, ...body } });

    // Also log the acquisition on the public ownership chain, if we have
    // an IMEI and a named source (so /device-lookup shows the full history).
    if (body.imei && body.sourceName) {
      await db.deviceTransaction.create({
        data: {
          shopId, loggedById: userId, imei: body.imei, deviceModel: body.deviceModel,
          sellerName: body.sourceName, sellerPhone: body.sourcePhone,
          buyerName: "فروشنده (این مغازه)", price: body.purchasePrice,
          note: "خرید توسط فروشنده برای موجودی فروش",
        },
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    if ((e as Error).message === "not_a_dealer") {
      return NextResponse.json({ error: "not_a_dealer", message: "این بخش فقط برای مغازه‌های فروشنده فعال است" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
