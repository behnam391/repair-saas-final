import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { INDUSTRY_WORKSPACES, isIndustryKey } from "@/lib/industry-workspaces";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { industry: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    if (!isIndustryKey(params.industry)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    // Never infer a shop's industry from its name or reuse MOBILE/COMPUTER records.
    const where = { shopId, deviceCategory: INDUSTRY_WORKSPACES[params.industry].category };
    const [counts, tickets] = await db.$transaction([
      db.ticket.groupBy({ by: ["status"], orderBy: { status: "asc" }, where, _count: { _all: true } }),
      db.ticket.findMany({ where, orderBy: { createdAt: "desc" }, take: 30,
        select: { id: true, no: true, deviceModel: true, deviceType: true, status: true, createdAt: true,
          customer: { select: { name: true } } } }),
    ]);
    return NextResponse.json({ counts: Object.fromEntries(counts.map(c => [c.status, typeof c._count === "object" ? c._count._all ?? 0 : 0])), tickets },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
