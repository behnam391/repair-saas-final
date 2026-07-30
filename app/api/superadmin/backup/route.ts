import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Every Prisma model, so a backup is a complete snapshot. Read via
// (db as any)[name] so this list stays resilient to the client's typing.
const MODELS = [
  "shop", "user", "customer", "ticket", "ticketMessage", "ticketHistory",
  "inventoryItem", "ticketPart", "invoice", "invoiceItem", "expense",
  "subscription", "walletTransaction", "giftCode", "platformAdmin",
  "passwordResetToken", "signupVerification", "marketListing", "conversation",
  "message", "marketReply", "deviceFlag", "deviceTransaction", "favoriteBrand",
  "customDeviceModel", "issueTemplate", "supportTicket", "supportReply",
  "returnRecord", "platformSettings", "notification", "adBanner", "partRequest",
  "referencePrice", "pendingIntake", "rating", "platformCustomer",
  "customerPasswordResetToken", "externalApiKey", "dealerInventory",
  "shopPartnership", "shopReferral", "impersonationToken", "errorLog",
];

// GET /api/superadmin/backup — super-admin only. Streams a full JSON snapshot of
// the whole database as a file download. Nothing is stored on the server (the
// dump includes password hashes and personal data, so it must never sit in a
// public bucket) — it goes straight to the admin's machine over HTTPS. This is
// the portable, on-demand backup; the database provider's own PITR is the
// automatic safety net.
export async function GET() {
  try {
    await requireSuperAdmin();

    const models: Record<string, unknown> = {};
    for (const m of MODELS) {
      try {
        models[m] = await (db as any)[m].findMany();
      } catch {
        models[m] = { error: "unavailable" };
      }
    }

    const stamp = new Date().toISOString();
    const payload = JSON.stringify({ app: "peyvo", exportedAt: stamp, models }, null, 2);
    const dateOnly = stamp.slice(0, 10);

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="peyvo-backup-${dateOnly}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
