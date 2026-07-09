import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/devices/:imei — the "medical record" of a phone.
// Deliberately nationwide (not shop-scoped) like /api/market: any signed-in
// technician or dealer, anywhere in Iran, can pull up a device's full
// history by IMEI. Only authentication is required, not shop ownership.
export async function GET(_req: NextRequest, { params }: { params: { imei: string } }) {
  try {
    await requireSession();
    const imei = params.imei.trim();
    if (imei.length < 6) {
      return NextResponse.json({ error: "invalid_imei" }, { status: 400 });
    }

    const [tickets, flags, transactions] = await Promise.all([
      db.ticket.findMany({
        where: { imei },
        include: { shop: { select: { name: true } }, history: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      db.deviceFlag.findMany({
        where: { imei },
        include: { shop: { select: { name: true } }, reporter: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.deviceTransaction.findMany({
        where: { imei },
        include: { shop: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ imei, tickets, flags, transactions });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
