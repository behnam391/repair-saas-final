import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";
import { listPagination } from "@/lib/list-pagination";
import type { Prisma } from "@prisma/client";

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

export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
    const params = req.nextUrl.searchParams;
    const paged = params.has("page");
    const paging = listPagination(params);
    const q = (params.get("q") || "").trim().slice(0,150);
    const category = params.get("category");
    const where: Prisma.InventoryItemWhereInput = { shopId, ...(q ? { OR: ["name","deviceModel","description"].map(field => ({ [field]: { contains: q, mode: "insensitive" } })) } : {}), ...(["PART","ACCESSORY","PHONE","TOOL","OTHER"].includes(category || "") ? { category: category! } : {}) };
    const items = await db.inventoryItem.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(paged ? { skip: paging.skip, take: paging.take } : {}),
    });
    const totals = paged ? await db.$queryRaw<{ value: number; lowCount: number }[]>`
      SELECT COALESCE(SUM("quantity"::bigint * "costPrice"), 0)::float8 AS "value",
        COUNT(*) FILTER (WHERE "quantity" <= "lowStockAt")::int AS "lowCount"
      FROM "InventoryItem" WHERE "shopId" = ${shopId}
    ` : [];
    return NextResponse.json({
      items: items.map((i) => ({ ...i, lowStock: i.quantity <= i.lowStockAt })),
      ...(paged ? { total: await db.inventoryItem.count({ where }), page: paging.page, summary: totals[0] ?? { value: 0, lowCount: 0 } } : {}),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
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
