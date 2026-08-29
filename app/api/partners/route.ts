import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    const rows = await db.ticket.findMany({
      where: {
        shopId,
        partnerName: { not: null },
        ...(q ? { OR: [{ partnerName: { contains: q, mode: "insensitive" } }, { partnerPhone: { contains: q } }] } : {}),
      },
      select: { partnerName: true, partnerPhone: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    });

    const seen = new Set<string>();
    const partners = rows.flatMap((row) => {
      const name = row.partnerName?.trim();
      if (!name) return [];
      const phone = row.partnerPhone?.trim() ?? "";
      const key = `${name.toLocaleLowerCase("fa")}\u0000${phone}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ name, phone }];
    }).slice(0, 8);

    return NextResponse.json({ partners });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
