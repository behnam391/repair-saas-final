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
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize")) || 15));
    const where = q
      ? { OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" as const } },
        ] }
      : undefined;

    const customers = await db.platformCustomer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, phone: true, email: true, province: true, city: true,
        active: true, createdAt: true,
        _count: { select: { ratings: true } },
      },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({ ...c, ratingCount: c._count.ratings })),
      total: await db.platformCustomer.count({ where }),
      page,
      pageSize,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
