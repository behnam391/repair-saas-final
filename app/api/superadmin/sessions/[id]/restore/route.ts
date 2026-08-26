import { LoginSubjectKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

async function subjectIsActive(subjectKind: LoginSubjectKind, subjectId: string) {
  if (subjectKind === LoginSubjectKind.SHOP_USER) {
    const user = await db.user.findUnique({
      where: { id: subjectId },
      select: { active: true, shop: { select: { active: true } } },
    });
    return Boolean(user?.active && user.shop.active);
  }
  if (subjectKind === LoginSubjectKind.CUSTOMER) {
    const customer = await db.platformCustomer.findUnique({
      where: { id: subjectId },
      select: { active: true },
    });
    return Boolean(customer?.active);
  }
  return Boolean(await db.platformAdmin.findUnique({
    where: { id: subjectId },
    select: { id: true },
  }));
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireSuperAdmin();
    const row = await db.loginSession.findUnique({ where: { id: params.id } });
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!row.revokedAt) {
      return NextResponse.json({ error: "not_revoked", message: "این نشست در وضعیت قطع‌شده نیست." }, { status: 409 });
    }
    if (row.loggedOutAt || row.expiresAt <= new Date()) {
      return NextResponse.json({
        error: "expired",
        message: "این نشست خارج یا منقضی شده و قابل بازگردانی نیست؛ کاربر باید دوباره وارد شود.",
      }, { status: 409 });
    }
    if (!(await subjectIsActive(row.subjectKind, row.subjectId))) {
      return NextResponse.json({
        error: "account_inactive",
        message: "حساب یا تعمیرگاه غیرفعال است؛ ابتدا وضعیت خود حساب را فعال کنید.",
      }, { status: 409 });
    }

    const restored = await db.loginSession.updateMany({
      where: {
        id: row.id,
        revokedAt: row.revokedAt,
        loggedOutAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        lastRevokedAt: row.revokedAt,
        revokedAt: null,
        revokedByAdminId: null,
        revokedReason: null,
        restoredAt: new Date(),
        restoredByAdminId: admin.adminId,
        restorationCount: { increment: 1 },
      },
    });
    if (!restored.count) {
      return NextResponse.json({ error: "state_changed", message: "وضعیت نشست تغییر کرده است؛ فهرست را تازه‌سازی کنید." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[superadmin/sessions] restore failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
