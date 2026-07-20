import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/superadmin/users/:id/impersonate — issues a one-time,
// 10-minute link that logs support in as this user. Only works if the
// shop has supportAccessEnabled (owner or super admin can toggle this in
// /admin or /superadmin) — the token itself will silently fail to sign in
// if that flag gets turned off before the link is used.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireSuperAdmin();

    const user = await db.user.findUnique({ where: { id: params.id }, include: { shop: true } });
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!user.shop.supportAccessEnabled) {
      return NextResponse.json(
        { error: "access_not_granted", message: "این مغازه دسترسی پشتیبانی را فعال نکرده است." },
        { status: 403 }
      );
    }

    const token = randomBytes(32).toString("hex");
    await db.impersonationToken.create({
      data: { userId: user.id, token, createdByAdminId: adminId, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    const origin = req.nextUrl.origin;
    return NextResponse.json({ url: `${origin}/impersonate?token=${token}` });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
