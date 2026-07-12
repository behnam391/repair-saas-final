import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const shop = await db.shop.update({ where: { id: params.id }, data: { verificationLevel: 3 } });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
