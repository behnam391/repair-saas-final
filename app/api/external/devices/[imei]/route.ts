import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireExternalScope, ExternalAuthError } from "@/lib/external-auth";

export const dynamic = "force-dynamic";

// GET /api/external/devices/:imei
// Header required: X-API-Key: <key issued from /superadmin/external-keys>
//
// This is a read-only export WE control — it is not a real, verified
// connection to Iran's Asnaf/Tazirat/tax systems (no such public API
// exists for us to call). It exists so any of those agencies (or any
// future integration) can be issued credentials to pull our crowd-sourced
// stolen/debt flags and ownership-transfer records for a given IMEI.
// What each key can see is controlled entirely from /superadmin/external-keys
// (scopes), no code change needed to grant/revoke a category.
export async function GET(req: NextRequest, { params }: { params: { imei: string } }) {
  try {
    const keyRecord = await db.externalApiKey.findUnique({ where: { apiKey: req.headers.get("x-api-key") ?? "" } });
    if (!keyRecord || !keyRecord.active) return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
    const scopes = keyRecord.scopes.split(",").map((s) => s.trim());

    const imei = params.imei.trim();
    const result: any = { imei, disclaimer: "این داده‌ها گزارش‌های جمعی کاربران پلتفرم است، نه استعلام رسمی." };

    if (scopes.includes("device_flags")) {
      result.flags = await db.deviceFlag.findMany({
        where: { imei },
        select: { flagType: true, note: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
    }
    if (scopes.includes("device_transactions")) {
      result.transactions = await db.deviceTransaction.findMany({
        where: { imei },
        select: { sellerName: true, buyerName: true, deviceModel: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ExternalAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
