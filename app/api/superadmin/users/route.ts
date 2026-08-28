import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/superadmin/users — every user across every shop, with contact
// info (phone/email) visible only to the platform admin. Used when a shop
// owner loses access to their phone and support needs to verify who they
// are and reset their password manually.
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize")) || 15));
    const q = searchParams.get("q")?.trim();
    const role = searchParams.get("role")?.trim();
    const shop = searchParams.get("shop")?.trim();
    const active = searchParams.get("active");
    const where = {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
      ...(role ? { role: role as any } : {}),
      ...(shop ? { shopId: shop } : {}),
      ...(active === "true" || active === "false" ? { active: active === "true" } : {}),
    };
    const users = await db.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, phone: true, email: true, role: true, active: true,
        shop: { select: { id: true, name: true, supportAccessEnabled: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const [total, shops] = await Promise.all([
      db.user.count({ where }),
      db.shop.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return NextResponse.json({ users, total, page, pageSize, shops });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
