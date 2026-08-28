import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Super-admin-only view over the ErrorLog table (the خطاها panel).
//   GET    ?filter=unresolved|all|client|server|payment|boundary&limit=200
//          → { errors, counts: { total, unresolved } }
//   PATCH  { id, resolved }              → tick one entry resolved/unresolved
//          { resolveAll: true }          → tick every entry resolved
//   DELETE ?scope=resolved|all           → clear resolved (default) or all logs

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin("sessions");
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "unresolved";
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 200, 1), 500);

    const where: any = {};
    if (filter === "unresolved") where.resolved = false;
    else if (["client", "server", "payment", "boundary"].includes(filter)) where.source = filter;

    const [errors, total, unresolved] = await Promise.all([
      (db as any).errorLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
      (db as any).errorLog.count(),
      (db as any).errorLog.count({ where: { resolved: false } }),
    ]);

    return NextResponse.json({ errors, counts: { total, unresolved } });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireSuperAdmin("sessions");
    const body = await req.json().catch(() => ({}));

    if (body?.resolveAll === true) {
      await (db as any).errorLog.updateMany({ where: { resolved: false }, data: { resolved: true } });
      return NextResponse.json({ ok: true });
    }
    if (typeof body?.id === "string") {
      await (db as any).errorLog.update({
        where: { id: body.id },
        data: { resolved: body.resolved !== false },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin("sessions");
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "resolved";
    const where = scope === "all" ? {} : { resolved: true };
    const { count } = await (db as any).errorLog.deleteMany({ where });
    return NextResponse.json({ ok: true, deleted: count });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
