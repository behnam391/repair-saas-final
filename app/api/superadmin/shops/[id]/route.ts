import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({ active: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const { active } = UpdateSchema.parse(await req.json());
    const shop = await db.shop.update({ where: { id: params.id }, data: { active } });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
