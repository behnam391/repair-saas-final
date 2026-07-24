import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  role: z.enum(["OWNER", "FRONTDESK", "HARDWARE", "SOFTWARE", "BOARD"]).optional(),
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
      data: body,
      select: { id: true, name: true, phone: true, role: true, active: true },
    });
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

    try {
      await db.user.delete({ where: { id: target.id } });
      return NextResponse.json({ ok: true, deactivated: false });
    } catch (delErr: any) {
      // P2003 = foreign key constraint failed: this staff member has real
      // history (assigned tickets, ticket-history entries, market posts,
      // ratings, etc.) that must stay intact. Fall back to deactivating —
      // this already fully blocks their login, matching the practical
      // meaning of "removing" them.
      if (delErr?.code === "P2003") {
        await db.user.update({ where: { id: target.id }, data: { active: false } });
        return NextResponse.json({ ok: true, deactivated: true });
      }
      throw delErr;
    }
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
