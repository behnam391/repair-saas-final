import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const requests = await db.partRequest.findMany({
      where: { shopId },
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ requests });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({ itemName: z.string().min(1), note: z.string().optional(), ticketId: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    const body = Schema.parse(await req.json());
    const request = await db.partRequest.create({ data: { shopId, requestedById: userId, ...body } });

    // Notify the shop owner(s) that a part is needed.
    const owners = await db.user.findMany({ where: { shopId, role: "OWNER" } });
    for (const o of owners) {
      await notifyUser(o.id, "درخواست خرید قطعه", `درخواست قطعه «${body.itemName}» ثبت شد.`, "/admin/parts");
    }

    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
