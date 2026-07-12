import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const shops = await db.shop.findMany({
      where: { verificationRequestedAt: { not: null } },
      select: {
        id: true, name: true, address: true, phone: true, landlinePhone: true, businessSize: true,
        specialties: true, verificationLevel: true, verificationRequestedAt: true,
        users: { where: { role: "OWNER" }, select: { name: true, phone: true, nationalId: true, birthDate: true } },
      },
      orderBy: { verificationRequestedAt: "desc" },
    });
    return NextResponse.json({ shops });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
