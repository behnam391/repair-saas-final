import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/superadmin/users — every user across every shop, with contact
// info (phone/email) visible only to the platform admin. Used when a shop
// owner loses access to their phone and support needs to verify who they
// are and reset their password manually.
export async function GET() {
  try {
    await requireSuperAdmin();
    const users = await db.user.findMany({
      select: {
        id: true, name: true, phone: true, email: true, role: true, active: true,
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
