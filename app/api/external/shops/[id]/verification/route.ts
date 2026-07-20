import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireExternalScope, ExternalAuthError } from "@/lib/external-auth";

export const dynamic = "force-dynamic";

// GET /api/external/shops/:id/verification
// Header required: X-API-Key with the "shop_verification" scope granted.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireExternalScope(req, "shop_verification");
    const shop = await db.shop.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, verificationLevel: true, active: true, createdAt: true },
    });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof ExternalAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
