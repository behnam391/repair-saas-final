import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { preprocessPhone } from "@/lib/phone";
import { z } from "zod";
import { LoginSubjectKind } from "@prisma/client";
import { revokeSessionsForSubject } from "@/lib/login-sessions";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.preprocess(preprocessPhone, z.string().min(5).optional()),
  role: z.enum(["OWNER", "FRONTDESK", "HARDWARE", "SOFTWARE", "BOARD"]).optional(),
  specialty: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]).nullable().optional(),
  active: z.boolean().optional(),
  email: z.string().optional(),
  gmailId: z.string().optional(),
  nationalId: z.string().optional(),
});

// PATCH /api/staff/:id — owner-only, and only within their own shop.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const target = await db.user.findFirst({ where: { id: params.id, shopId } });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = UpdateSchema.parse(await req.json());

    // Phone is the unique login key — reject if another account already uses it.
    if (body.phone && body.phone !== target.phone) {
      const clash = await db.user.findUnique({ where: { phone: body.phone } });
      if (clash) return NextResponse.json({ message: "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است" }, { status: 409 });
    }

    const user = await db.user.update({
      where: { id: target.id },
      data: body as any,
      select: { id: true, name: true, phone: true, role: true, active: true },
    });
    const phoneChanged = body.phone !== undefined && body.phone !== target.phone;
    const deactivated = body.active === false && target.active;
    if (phoneChanged || deactivated) {
      await revokeSessionsForSubject(LoginSubjectKind.SHOP_USER, target.id, {
        reason: deactivated ? "STAFF_DEACTIVATED" : "LOGIN_PHONE_CHANGED",
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

// DELETE /api/staff/:id — owner-only. A staff member who was never assigned
// a ticket and has no history entries can be fully removed. Anyone with
// real activity on record is deactivated instead (same effect for
// login/access purposes) so past tickets/history never lose their
// technician reference — we try the real delete first and let Postgres's
// own foreign-key check tell us which case we're in, rather than manually
// enumerating every relation that points at User.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const target = await db.user.findFirst({ where: { id: params.id, shopId } });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (target.id === userId) {
      return NextResponse.json({ message: "نمی‌توانید حساب خودتان را حذف کنید" }, { status: 400 });
    }
    if (target.role === "OWNER") {
      const otherOwners = await db.user.count({ where: { shopId, role: "OWNER", id: { not: target.id } } });
      if (otherOwners === 0) {
        return NextResponse.json({ message: "باید حداقل یک مدیر در مغازه باقی بماند" }, { status: 400 });
      }
    }

    // A staff member with NO activity on record (no assigned tickets,
    // history, market posts, ratings, etc.) can be fully deleted — this
    // frees their phone number for re-use. Anyone with real activity is
    // instead deactivated so past tickets/history keep their technician
    // reference intact. We try the hard delete first; if the database
    // refuses for ANY reason (foreign-key constraint being the expected
    // one), we fall back to deactivating rather than surfacing an error —
    // "remove from the shop, keep the history" is exactly the intent.
    let deactivated = false;
    try {
      await db.user.delete({ where: { id: target.id } });
    } catch (delErr: any) {
      try {
        await db.user.update({ where: { id: target.id }, data: { active: false } });
        deactivated = true;
      } catch (deactErr) {
        console.error("[staff delete] both delete and deactivate failed", delErr, deactErr);
        return NextResponse.json({ message: "حذف کارمند ناموفق بود، دوباره تلاش کنید" }, { status: 500 });
      }
    }
    await revokeSessionsForSubject(LoginSubjectKind.SHOP_USER, target.id, {
      reason: deactivated ? "STAFF_DEACTIVATED" : "STAFF_DELETED",
    });
    return NextResponse.json({ ok: true, deactivated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
