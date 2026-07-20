import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireExternalScope, ExternalAuthError } from "@/lib/external-auth";

export const dynamic = "force-dynamic";

// GET /api/external/shops?query=&province=
// Header required: X-API-Key with the "shop_directory" scope granted.
export async function GET(req: NextRequest) {
  try {
    await requireExternalScope(req, "shop_directory");
    const { searchParams } = req.nextUrl;
    const query = searchParams.get("query");
    const province = searchParams.get("province");

    const shops = await db.shop.findMany({
      where: {
        active: true,
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        ...(province ? { province } : {}),
      },
      select: {
        id: true, name: true, type: true, address: true, phone: true, landlinePhone: true,
        province: true, verificationLevel: true, createdAt: true,
      },
      take: 200,
    });

    return NextResponse.json({ shops });
  } catch (e) {
    if (e instanceof ExternalAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
