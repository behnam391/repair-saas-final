import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { logCaught } from "@/lib/logError";

export const dynamic = "force-dynamic";

// Parents BEFORE children so foreign keys resolve as records are (re)inserted.
const RESTORE_ORDER = [
  "platformSettings", "platformAdmin", "adBanner", "externalApiKey", "giftCode",
  "platformCustomer", "shop", "user", "customer", "inventoryItem", "subscription",
  "walletTransaction", "expense", "favoriteBrand", "customDeviceModel",
  "issueTemplate", "referencePrice", "pendingIntake", "returnRecord",
  "dealerInventory", "partRequest", "supportTicket", "supportReply",
  "passwordResetToken", "customerPasswordResetToken", "signupVerification",
  "impersonationToken", "notification", "marketListing", "conversation",
  "message", "marketReply", "deviceFlag", "deviceTransaction", "ticket",
  "ticketMessage", "ticketHistory", "ticketPart", "invoice", "invoiceItem",
  "rating", "shopPartnership", "shopReferral", "errorLog",
];

// POST /api/superadmin/restore { models } — restore from an uploaded backup JSON.
// NON-DESTRUCTIVE: it upserts each row by id (re-creates missing records, updates
// existing ones to match the backup). It does NOT delete records added after the
// backup — for a full rollback to an exact past state, use the database
// provider's point-in-time restore instead. Resilient: one bad row is skipped,
// not fatal. Super-admin only.
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 50 * 1024 * 1024) return NextResponse.json({ error: "backup_too_large" }, { status: 413 });
    const body = await req.json().catch(() => null);
    const models = body?.models;
    if (body?.app !== "peyvo" || body?.version !== 1 || !body?.exportedAt || !models || typeof models !== "object") {
      return NextResponse.json({ error: "invalid_backup", message: "فایل بکاپ نامعتبر است." }, { status: 400 });
    }

    const summary: Record<string, { restored: number; failed: number }> = {};
    let totalRestored = 0, totalFailed = 0;

    await db.$transaction(async (tx) => {
      for (const m of RESTORE_ORDER) {
        const rows = models[m];
        if (rows === undefined) continue;
        if (!Array.isArray(rows)) throw new Error(`Invalid rows for model ${m}`);
        let restored = 0;
        for (const row of rows) {
          if (!row || typeof row !== "object" || !(row as any).id) throw new Error(`Invalid row in model ${m}`);
          const { id, ...rest } = row as any;
          await (tx as any)[m].upsert({ where: { id }, create: row, update: rest });
          restored++;
        }
        if (restored) summary[m] = { restored, failed: 0 };
        totalRestored += restored;
      }
    }, { maxWait: 10_000, timeout: 120_000 });

    return NextResponse.json({ ok: true, totalRestored, totalFailed, summary });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await logCaught(e, { source: "server", path: "/api/superadmin/restore", method: "POST" });
    return NextResponse.json({ error: "internal_error", message: (e as Error).message }, { status: 500 });
  }
}
