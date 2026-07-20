import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/reports/payroll?from=&to= — owner-only. Sums Invoice.technicianWage
// grouped by the technician assigned to each ticket, within an optional
// date range (defaults to the current calendar month).
export async function GET(req: NextRequest) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const invoices = await db.invoice.findMany({
      where: {
        shopId,
        createdAt: { gte: from ? new Date(from) : startOfMonth, ...(to ? { lte: new Date(to) } : {}) },
      },
      include: { ticket: { select: { assignedToId: true, assignedTo: { select: { name: true, role: true } } } } },
    });

    const byTech: Record<string, { name: string; role: string; totalWage: number; ticketCount: number }> = {};
    for (const inv of invoices) {
      const techId = inv.ticket.assignedToId;
      if (!techId || !inv.ticket.assignedTo) continue;
      if (!byTech[techId]) byTech[techId] = { name: inv.ticket.assignedTo.name, role: inv.ticket.assignedTo.role, totalWage: 0, ticketCount: 0 };
      byTech[techId].totalWage += inv.technicianWage;
      byTech[techId].ticketCount += 1;
    }

    const rows = Object.entries(byTech).map(([techId, v]) => ({ techId, ...v }));
    const totalPayroll = rows.reduce((s, r) => s + r.totalWage, 0);

    return NextResponse.json({ rows, totalPayroll, period: { from: from ?? startOfMonth.toISOString(), to: to ?? new Date().toISOString() } });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
