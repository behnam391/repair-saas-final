import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/tickets/search?q=...&status=...&from=...&to=...
// q matches against customer name/phone, device model, or IMEI.
export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const tickets = await db.ticket.findMany({
      where: {
        shopId,
        ...(status ? { status: status as any } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
        ...(q
          ? {
              OR: [
                { deviceModel: { contains: q, mode: "insensitive" } },
                { imei: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { customer: { phone: { contains: q } } },
              ],
            }
          : {}),
      },
      include: { customer: true, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ tickets });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
