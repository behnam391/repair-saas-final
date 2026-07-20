import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/reports/monthly-revenue — invoice totals for the last 12
// calendar months (Gregorian bucketing, Persian labels), OWNER-only.
// Split into repair vs direct-sale revenue so the chart can stack them.
export async function GET() {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const invoices = await db.invoice.findMany({
      where: { shopId, createdAt: { gte: start } },
      select: { total: true, type: true, createdAt: true },
    });

    // Build the 12 buckets first so empty months still show as zero bars.
    const buckets: { key: string; label: string; repair: number; sale: number }[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < 12; i++) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      const label = cursor.toLocaleDateString("fa-IR", { month: "short", year: "2-digit" });
      buckets.push({ key, label, repair: 0, sale: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const inv of invoices) {
      const d = new Date(inv.createdAt);
      const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!b) continue;
      if (inv.type === "SALE") b.sale += inv.total;
      else b.repair += inv.total;
    }

    return NextResponse.json({
      months: buckets.map(({ label, repair, sale }) => ({ label, repair, sale, total: repair + sale })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
