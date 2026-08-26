import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireSuperAdmin();
    if (params.id === admin.loginSessionId) {
      return NextResponse.json({ error: "current_session", message: "نشست فعلی را نمی‌توان از همین صفحه قطع کرد." }, { status: 409 });
    }

    const existing = await db.loginSession.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 120) : "MANUAL";
    const result = await db.loginSession.updateMany({
      where: {
        id: params.id,
        revokedAt: null,
        loggedOutAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        revokedAt: new Date(),
        revokedByAdminId: admin.adminId,
        revokedReason: reason || "MANUAL",
      },
    });
    if (!result.count) return NextResponse.json({ error: "already_ended", message: "این نشست قبلاً پایان یافته است." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[superadmin/sessions] revoke failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
