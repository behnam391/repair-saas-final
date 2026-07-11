import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ brand: z.string().min(1), model: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = Schema.parse(await req.json());
    const entry = await db.customDeviceModel.create({ data: { shopId, ...body } });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
