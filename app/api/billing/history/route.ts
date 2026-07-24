import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/billing/history — this shop's own past checkout attempts
// (Zarinpal), newest first. Lets the owner see what was actually paid,
// not just the current plan/expiry.
export async function GET() {
  try {
    const { shopId } = await requireSession();
    const subscriptions = await db.subscription.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      select: { id: true, plan: true, months: true, amount: true, status: true, createdAt: true },
      take: 50,
    });
    return NextResponse.json({ subscriptions });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
