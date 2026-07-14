import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/external/devices/:imei
// Header required: X-API-Key: <key issued from /superadmin/external-keys>
//
// This is a read-only export WE control — it is not a real, verified
// connection to Iran's Asnaf/Tazirat/tax systems (no such public API
// exists for us to call). It exists so any of those agencies (or any
// future integration) can be issued credentials to pull our crowd-sourced
// stolen/debt flags and ownership-transfer records for a given IMEI.
export async function GET(req: NextRequest, { params }: { params: { imei: string } }) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "missing_api_key" }, { status: 401 });

  const keyRecord = await db.externalApiKey.findUnique({ where: { apiKey } });
  if (!keyRecord || !keyRecord.active) return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });

  const imei = params.imei.trim();
  const [flags, transactions] = await Promise.all([
    db.deviceFlag.findMany({
      where: { imei },
      select: { flagType: true, note: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.deviceTransaction.findMany({
      where: { imei },
      select: { sellerName: true, buyerName: true, deviceModel: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ imei, flags, transactions, disclaimer: "این داده‌ها گزارش‌های جمعی کاربران پلتفرم است، نه استعلام رسمی." });
}
