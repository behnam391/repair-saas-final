import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();

    const shops = await db.shop.findMany({
      include: {
        _count: { select: { users: true, tickets: true } },
        subscriptions: { where: { status: "PAID" }, select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = shops.map((s) => ({
      id: s.id,
      name: s.name,
      plan: s.plan,
      active: s.active,
      supportAccessEnabled: s.supportAccessEnabled,
      planExpiresAt: s.planExpiresAt,
      userCount: s._count.users,
      ticketCount: s._count.tickets,
      totalPaid: s.subscriptions.reduce((sum, sub) => sum + sub.amount, 0),
      createdAt: s.createdAt,
    }));

    const totalRevenue = result.reduce((sum, s) => sum + s.totalPaid, 0);

    return NextResponse.json({ shops: result, totalRevenue });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
