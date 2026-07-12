import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/verification/request — owner declares their shop profile is
// complete and asks the platform to review it. Level 1 -> 2 happens
// immediately (self-declared); level 2 -> 3 only happens when a platform
// admin approves it from /superadmin/verification.
export async function POST() {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
    const nextLevel = shop.verificationLevel < 2 ? 2 : shop.verificationLevel;

    const updated = await db.shop.update({
      where: { id: shopId },
      data: { verificationLevel: nextLevel, verificationRequestedAt: new Date() },
    });

    return NextResponse.json({ shop: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
