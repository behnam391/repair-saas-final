import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  category: z.enum(["PART", "ACCESSORY", "PHONE", "TOOL", "OTHER"]).optional(),
  deviceModel: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  quantity: z.number().int().min(0).optional(),
  lowStockAt: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  sellPrice: z.number().int().min(0).optional(),
  condition: z.enum(["WORKING", "DEFECTIVE"]).optional(),
  frequentlyUsed: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const item = await db.inventoryItem.findFirst({ where: { id: params.id, shopId } });
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = UpdateSchema.parse(await req.json());
    const data = {
      ...body,
      deviceModel: body.deviceModel === undefined ? undefined : body.deviceModel || null,
      description: body.description === undefined ? undefined : body.description || null,
      imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl || null,
    };
    const updated = await db.inventoryItem.update({ where: { id: item.id }, data });
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
    const item = await db.inventoryItem.findFirst({ where: { id: params.id, shopId } });
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Can't delete an item that's already tied to invoice history — that
    // would corrupt past financial records. Zero it out instead.
    const usedCount = await db.ticketPart.count({ where: { itemId: item.id } });
    if (usedCount > 0) {
      await db.inventoryItem.update({ where: { id: item.id }, data: { quantity: 0 } });
      return NextResponse.json({ ok: true, zeroed: true });
    }

    await db.inventoryItem.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
