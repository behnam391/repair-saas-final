import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/reports/staff — for each technician: tickets closed and total
// revenue from invoices on tickets they were assigned to when delivered.
export async function GET() {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const staff = await db.user.findMany({ where: { shopId }, select: { id: true, name: true, role: true } });

    const report = await Promise.all(
      staff.map(async (tech) => {
        const tickets = await db.ticket.findMany({
          where: { shopId, assignedToId: tech.id, status: "DELIVERED" },
          include: { invoice: true },
        });
        const closedCount = tickets.length;
        const revenue = tickets.reduce((sum, t) => sum + (t.invoice?.total ?? 0), 0);
        return { techId: tech.id, name: tech.name, role: tech.role, closedCount, revenue };
      })
    );

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const shopRevenue = await db.invoice.aggregate({
      where: { shopId, createdAt: { gte: monthAgo } },
      _sum: { total: true },
    });

    return NextResponse.json({ staff: report, last30DaysRevenue: shopRevenue._sum.total ?? 0 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
