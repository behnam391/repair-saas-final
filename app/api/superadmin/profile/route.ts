import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { adminId } = await requireSuperAdmin();
    const admin = await db.platformAdmin.findUnique({ where: { id: adminId }, select: { id: true, name: true, phone: true, createdAt: true } });
    return NextResponse.json({ admin });
  } catch (e) { return NextResponse.json({ error: e instanceof UnauthorizedError ? "unauthorized" : "internal_error" }, { status: e instanceof UnauthorizedError ? 401 : 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { adminId } = await requireSuperAdmin();
    const { name } = z.object({ name: z.string().trim().min(2).max(80) }).parse(await req.json());
    const admin = await db.platformAdmin.update({ where: { id: adminId }, data: { name }, select: { id: true, name: true, phone: true } });
    return NextResponse.json({ admin, message: "نام مدیر ذخیره شد؛ برای نمایش در همه بخش‌ها یک‌بار خارج و دوباره وارد شوید." });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
