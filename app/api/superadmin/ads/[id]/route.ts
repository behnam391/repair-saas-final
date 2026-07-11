import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ active: z.boolean().optional() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = Schema.parse(await req.json());
    const ad = await db.adBanner.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ ad });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    await db.adBanner.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
