import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ active: z.boolean().optional(), scopes: z.array(z.string()).optional() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = Schema.parse(await req.json().catch(() => ({})));
    const data: any = {};
    if (body.active !== undefined) data.active = body.active;
    if (body.scopes) data.scopes = body.scopes.join(",");
    if (Object.keys(data).length === 0) data.active = false; // back-compat: bare PATCH call = revoke

    const key = await db.externalApiKey.update({ where: { id: params.id }, data });
    return NextResponse.json({ key });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
