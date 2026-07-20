import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SellSchema = z.object({
  soldPrice: z.number().int().min(0),
  buyerName: z.string().min(1),
  buyerPhone: z.string().optional(),
});

// PATCH /api/dealer/inventory/:id — mark an in-stock phone as sold. Also
// appends to the public ownership chain (DeviceTransaction) if it has an IMEI.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const item = await db.dealerInventory.findFirst({ where: { id: params.id, shopId } });
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = SellSchema.parse(await req.json());

    const updated = await db.$transaction(async (tx) => {
      const upd = await tx.dealerInventory.update({
        where: { id: item.id },
        data: { status: "SOLD", soldPrice: body.soldPrice, buyerName: body.buyerName, buyerPhone: body.buyerPhone, soldAt: new Date() },
      });
      if (item.imei) {
        await tx.deviceTransaction.create({
          data: {
            shopId, imei: item.imei, deviceModel: item.deviceModel,
            sellerName: "فروشنده (این مغازه)", buyerName: body.buyerName, buyerPhone: body.buyerPhone,
            price: body.soldPrice, note: "فروش از موجودی فروشنده",
          },
        });
      }
      return upd;
    });

    return NextResponse.json({ item: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const item = await db.dealerInventory.findFirst({ where: { id: params.id, shopId } });
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await db.dealerInventory.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
