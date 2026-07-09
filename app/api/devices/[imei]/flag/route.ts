import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const FlagSchema = z.object({
  flagType: z.enum(["STOLEN", "INSTALLMENT_DEBT", "OTHER"]),
  note: z.string().min(3),
});

// POST /api/devices/:imei/flag — anyone signed in can report a concern.
// This is crowd-sourced, not an authoritative/legal check — the UI must
// always show that caveat next to any flag.
export async function POST(req: NextRequest, { params }: { params: { imei: string } }) {
  try {
    const { shopId, userId } = await requireSession();
    const body = FlagSchema.parse(await req.json());
    const imei = params.imei.trim();

    const flag = await db.deviceFlag.create({
      data: { imei, shopId, reporterId: userId, ...body },
      include: { shop: { select: { name: true } }, reporter: { select: { name: true } } },
    });

    return NextResponse.json({ flag }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
