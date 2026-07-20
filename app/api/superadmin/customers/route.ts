import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/superadmin/customers?q= — every nationwide customer account,
// with how many direct ratings each has submitted (spam moderation aid).
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const customers = await db.platformCustomer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, name: true, phone: true, email: true, province: true, city: true,
        active: true, createdAt: true,
        _count: { select: { ratings: true } },
      },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({ ...c, ratingCount: c._count.ratings })),
      total: await db.platformCustomer.count(),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
