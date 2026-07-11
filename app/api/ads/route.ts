import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSession();
    const ads = await db.adBanner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ ads });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
