import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.enum(["PART", "ACCESSORY", "PHONE", "TOOL", "OTHER"]).default("PART"),
  deviceModel: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  quantity: z.number().int().min(0),
  lowStockAt: z.number().int().min(0).default(2),
  costPrice: z.number().int().min(0),
  sellPrice: z.number().int().min(0),
});

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const items = await db.inventoryItem.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      items: items.map((i) => ({ ...i, lowStock: i.quantity <= i.lowStockAt })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = ItemSchema.parse(await req.json());
    const item = await db.inventoryItem.create({
      data: {
        shopId, ...body,
        deviceModel: body.deviceModel || null,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
