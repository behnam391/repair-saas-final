import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  deviceModel: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),
  reason: z.string().min(1).optional(),
  refundAmount: z.number().int().optional(),
  resolved: z.boolean().optional(),
  resolutionNote: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireSession();
    const record = await db.returnRecord.findFirst({ where: { id: params.id, shopId } });
    if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = Schema.parse(await req.json());
    const updated = await db.returnRecord.update({ where: { id: record.id }, data: body });
    return NextResponse.json({ record: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
