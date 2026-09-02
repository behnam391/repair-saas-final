import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { preprocessPhone } from "@/lib/phone";
import { revokeSessionsForSubject } from "@/lib/login-sessions";
import { LoginSubjectKind } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.preprocess(preprocessPhone, z.string().min(5).optional()),
  email: z.string().optional(),
  active: z.boolean().optional(),
});

// PATCH /api/superadmin/users/:id — platform admin edits a user's contact
// info (e.g. a shop owner who changed their number and can't get in).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireSuperAdmin("shops");
    const body = UpdateSchema.parse(await req.json());

    const existing = await db.user.findUnique({
      where: { id: params.id },
      select: { phone: true },
    });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (body.phone) {
      const clash = await db.user.findFirst({ where: { phone: body.phone, id: { not: params.id } } });
      if (clash) return NextResponse.json({ message: "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است" }, { status: 409 });
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: body,
      select: { id: true, name: true, phone: true, email: true, active: true },
    });

    const phoneChanged = body.phone !== undefined && body.phone !== existing.phone;
    const accountDisabled = body.active === false;
    if (phoneChanged || accountDisabled) {
      await revokeSessionsForSubject(LoginSubjectKind.SHOP_USER, params.id, {
        adminId,
        reason: accountDisabled ? "ACCOUNT_DISABLED" : "LOGIN_PHONE_CHANGED",
      });
    }

    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// DELETE /api/superadmin/users/:id — remove a team member platform-wide.
// Accounts with historical relations are deactivated instead of breaking
// repair, invoice or audit history. Shop owners must be managed through the
// shop lifecycle, so an accidental click can never orphan a business.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireSuperAdmin("shops");
    const target = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, active: true },
    });
    if (!target) return NextResponse.json({ error: "not_found", message: "کاربر پیدا نشد" }, { status: 404 });
    if (target.role === "OWNER") {
      return NextResponse.json({ message: "حذف مالک از این بخش مجاز نیست؛ ابتدا وضعیت خودِ فروشگاه را بررسی کنید" }, { status: 400 });
    }

    let deactivated = false;
    try {
      await db.user.delete({ where: { id: target.id } });
    } catch (deleteError) {
      try {
        await db.user.update({ where: { id: target.id }, data: { active: false } });
        deactivated = true;
      } catch (deactivateError) {
        console.error("[superadmin user delete] both operations failed", deleteError, deactivateError);
        return NextResponse.json({ message: "حذف کاربر انجام نشد؛ دوباره تلاش کنید" }, { status: 500 });
      }
    }

    await revokeSessionsForSubject(LoginSubjectKind.SHOP_USER, target.id, {
      adminId,
      reason: deactivated ? "STAFF_DEACTIVATED" : "STAFF_DELETED",
    });
    return NextResponse.json({ ok: true, deactivated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
