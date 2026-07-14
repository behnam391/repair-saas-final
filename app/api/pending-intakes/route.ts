import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const intakes = await db.pendingIntake.findMany({ where: { shopId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ intakes });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
