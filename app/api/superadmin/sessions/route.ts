import { LoginSubjectKind, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDeviceLabel } from "@/lib/login-sessions";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function statusWhere(status: string, now: Date): Prisma.LoginSessionWhereInput {
  if (status === "active") return { revokedAt: null, loggedOutAt: null, expiresAt: { gt: now } };
  if (status === "revoked") return { revokedAt: { not: null } };
  if (status === "logged_out") {
    return { revokedAt: null, OR: [{ loggedOutAt: { not: null } }, { expiresAt: { lte: now } }] };
  }
  return {};
}

function typeWhere(type: string): Prisma.LoginSessionWhereInput {
  if (type === "shop") return { subjectKind: LoginSubjectKind.SHOP_USER };
  if (type === "customer") return { subjectKind: LoginSubjectKind.CUSTOMER };
  if (type === "admin") return { subjectKind: LoginSubjectKind.SUPERADMIN };
  return {};
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const onlineSince = new Date(now.getTime() - 5 * 60_000);
    const status = searchParams.get("status") ?? "all";
    const type = searchParams.get("type") ?? "all";
    const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 100);

    const where: Prisma.LoginSessionWhereInput = {
      AND: [statusWhere(status, now), typeWhere(type)],
    };
    if (q) {
      (where.AND as Prisma.LoginSessionWhereInput[]).push({
        OR: [
          { nameAtLogin: { contains: q, mode: "insensitive" } },
          { phoneAtLogin: { contains: q, mode: "insensitive" } },
          { shopNameAtLogin: { contains: q, mode: "insensitive" } },
          { ipAddress: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const activeWhere: Prisma.LoginSessionWhereInput = { revokedAt: null, loggedOutAt: null, expiresAt: { gt: now } };
    const [rows, active, online, loggedOut, revoked] = await Promise.all([
      db.loginSession.findMany({
        where,
        orderBy: [{ signedInAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      db.loginSession.count({ where: activeWhere }),
      db.loginSession.count({ where: { ...activeWhere, lastActivityAt: { gte: onlineSince } } }),
      db.loginSession.count({ where: statusWhere("logged_out", now) }),
      db.loginSession.count({ where: statusWhere("revoked", now) }),
    ]);

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const sessions = page.map((row) => {
      const rowStatus = row.revokedAt ? "REVOKED" : (row.loggedOutAt || row.expiresAt <= now) ? "LOGGED_OUT" : "ACTIVE";
      return {
        ...row,
        status: rowStatus,
        onlineNow: rowStatus === "ACTIVE" && row.lastActivityAt >= onlineSince,
        deviceLabel: getDeviceLabel(row.userAgent),
        isCurrent: row.id === admin.loginSessionId,
      };
    });

    return NextResponse.json(
      {
        sessions,
        counts: { active, online, loggedOut, revoked, total: active + loggedOut + revoked },
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[superadmin/sessions] list failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
