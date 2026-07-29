import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// How long a checkout attempt may sit unpaid before we consider it abandoned.
// Gateway payment windows are short (~15 min); 30 gives comfortable margin.
const STALE_PENDING_MS = 30 * 60 * 1000;

// GET /api/billing/history — this shop's past checkout attempts, newest first.
// Before returning, it auto-cancels PENDING attempts older than STALE_PENDING_MS
// (the user opened the gateway but never completed) so the history doesn't fill
// up with dangling «در انتظار پرداخت» rows.
export async function GET() {
  try {
    const { shopId } = await requireSession();

    await db.subscription.updateMany({
      where: { shopId, status: "PENDING", createdAt: { lt: new Date(Date.now() - STALE_PENDING_MS) } },
      data: { status: "FAILED" },
    });

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

// PATCH /api/billing/history { id } — manually cancel one of this shop's own
// PENDING attempts right now (mark it FAILED), for the «لغو» button.
export async function PATCH(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { id } = await req.json();
    if (typeof id !== "string") return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    // Scope to this shop AND to PENDING only — never touch a PAID record.
    await db.subscription.updateMany({ where: { id, shopId, status: "PENDING" }, data: { status: "FAILED" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// DELETE /api/billing/history?id=X — remove a single non-paid attempt from the
// shop's history (tidy-up). PAID rows are protected so the payment record is
// never erased.
export async function DELETE(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    await db.subscription.deleteMany({ where: { id, shopId, status: { not: "PAID" } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
