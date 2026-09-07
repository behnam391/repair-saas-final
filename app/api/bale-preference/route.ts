import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { z } from "zod";

async function phoneForSession() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.disabled || user.isSuperAdmin) return null;
  const account = user.isCustomer
    ? await db.platformCustomer.findUnique({ where: { id: user.id }, select: { phone: true, active: true } })
    : await db.user.findUnique({ where: { id: user.id }, select: { phone: true, active: true } });
  return account?.active ? normalizePhone(account.phone) : null;
}
export async function GET() {
  const phone = await phoneForSession();
  if (!phone) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const preference = await db.balePreference.findUnique({ where: { phone } });
  return NextResponse.json({ enabled: preference?.enabled ?? false });
}
export async function PUT(req: NextRequest) {
  const phone = await phoneForSession();
  if (!phone) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  await db.balePreference.upsert({ where: { phone }, create: { phone, enabled: parsed.data.enabled }, update: { enabled: parsed.data.enabled } });
  return NextResponse.json({ ok: true });
}
