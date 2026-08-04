import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const returns = await db.returnRecord.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ returns });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({
  ticketId: z.string().optional(),
  deviceModel: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  reason: z.string().min(1),
  refundAmount: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = Schema.parse(await req.json());
    const record = await db.returnRecord.create({ data: { shopId, ...body } });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
