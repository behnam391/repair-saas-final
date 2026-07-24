import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().optional(),
  active: z.boolean().optional(),
});

// PATCH /api/superadmin/users/:id — platform admin edits a user's contact
// info (e.g. a shop owner who changed their number and can't get in).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = UpdateSchema.parse(await req.json());

    if (body.phone) {
      const clash = await db.user.findFirst({ where: { phone: body.phone, id: { not: params.id } } });
      if (clash) return NextResponse.json({ message: "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است" }, { status: 409 });
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: body,
      select: { id: true, name: true, phone: true, email: true, active: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
