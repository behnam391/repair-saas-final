import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { broadcastNotification } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ title: z.string().min(1), message: z.string().min(1), link: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { title, message, link } = Schema.parse(await req.json());
    await broadcastNotification(title, message, link);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
