import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { randomBytes } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const keys = await db.externalApiKey.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ keys });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({ label: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { label } = Schema.parse(await req.json());
    const apiKey = randomBytes(24).toString("hex");
    const key = await db.externalApiKey.create({ data: { label, apiKey } });
    return NextResponse.json({ key }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
