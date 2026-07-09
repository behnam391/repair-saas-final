import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TxSchema = z.object({
  deviceModel: z.string().min(1),
  sellerName: z.string().min(1),
  sellerPhone: z.string().optional(),
  buyerName: z.string().min(1),
  buyerPhone: z.string().optional(),
  price: z.number().int().optional(),
  note: z.string().optional(),
});

// POST /api/devices/:imei/transaction — a dealer logs a purchase/sale,
// building the device's public ownership chain (visible to anyone via
// GET /api/devices/:imei, same nationwide-visibility model as flags).
export async function POST(req: NextRequest, { params }: { params: { imei: string } }) {
  try {
    const { shopId, userId } = await requireSession();
    const body = TxSchema.parse(await req.json());
    const imei = params.imei.trim();

    const tx = await db.deviceTransaction.create({
      data: { imei, shopId, loggedById: userId, ...body },
      include: { shop: { select: { name: true } } },
    });

    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
