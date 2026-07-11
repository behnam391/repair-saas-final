import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { searchParams } = new URL(req.url);
    const deviceModel = searchParams.get("deviceModel");
    const prices = await db.referencePrice.findMany({
      where: { shopId, ...(deviceModel ? { deviceModel: { contains: deviceModel } } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ prices });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({
  deviceModel: z.string().min(1),
  issueLabel: z.string().min(1),
  suggestedPrice: z.number().int(),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);
    const body = Schema.parse(await req.json());
    const price = await db.referencePrice.create({ data: { shopId, ...body } });
    return NextResponse.json({ price }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
