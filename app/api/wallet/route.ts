import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const STALE_PENDING_MS = 30 * 60 * 1000;

// GET /api/wallet — this shop's wallet balance + ledger (newest first).
// Auto-cancels abandoned top-ups (PENDING older than 30 min) first, so the
// ledger doesn't accumulate dangling «در انتظار پرداخت» rows.
export async function GET() {
  try {
    const { shopId } = await requireSession();

    await (db as any).walletTransaction.updateMany({
      where: { shopId, type: "TOPUP", status: "PENDING", createdAt: { lt: new Date(Date.now() - STALE_PENDING_MS) } },
      data: { status: "FAILED" },
    });

    const shop = await db.shop.findUnique({ where: { id: shopId } });
    const transactions = await (db as any).walletTransaction.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ balance: (shop as any)?.walletBalance ?? 0, transactions });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
