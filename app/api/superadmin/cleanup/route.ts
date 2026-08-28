import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { deleteShopCascade } from "@/lib/cascade";

export const dynamic = "force-dynamic";

// Test-data cleanup for the super admin.
//   GET    → shops that look like test/abandoned accounts: zero tickets (empty)
//            OR explicitly flagged isTest. Each with age + counts.
//   PATCH  { shopId, isTest }   → mark/unmark a shop as test.
//   POST   { shopIds: [...] }   → bulk-delete the given shops (full cascade).
//            Safe by design: a request can only delete shops the caller listed.

export async function GET() {
  try {
    await requireSuperAdmin("maintenance");
    const shops = await (db as any).shop.findMany({
      select: {
        id: true, name: true, plan: true, createdAt: true, active: true, isTest: true,
        _count: { select: { tickets: true, users: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Candidates = empty (no tickets) OR manually flagged as test.
    const candidates = shops
      .filter((s: any) => s._count.tickets === 0 || s.isTest)
      .map((s: any) => ({
        id: s.id, name: s.name, plan: s.plan, createdAt: s.createdAt, isTest: s.isTest,
        ticketCount: s._count.tickets, userCount: s._count.users, invoiceCount: s._count.invoices,
      }));

    return NextResponse.json({ candidates, totalShops: shops.length });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireSuperAdmin("maintenance");
    const body = await req.json().catch(() => ({}));
    if (typeof body?.shopId !== "string") return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    await (db as any).shop.update({ where: { id: body.shopId }, data: { isTest: body.isTest !== false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin("maintenance");
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.shopIds) ? body.shopIds.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length === 0) return NextResponse.json({ error: "invalid_input", message: "موردی انتخاب نشده" }, { status: 400 });

    let deleted = 0;
    const failed: string[] = [];
    for (const id of ids) {
      try { await deleteShopCascade(id); deleted++; }
      catch { failed.push(id); }
    }
    return NextResponse.json({ ok: true, deleted, failed });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
