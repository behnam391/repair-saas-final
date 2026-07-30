import { db } from "@/lib/db";

// Every Prisma model, so a snapshot is complete. Read via (db as any)[name] so
// the list stays resilient to client typing.
export const BACKUP_MODELS = [
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

// Builds the full-database JSON snapshot. Never throws on a single model — a
// model that can't be read is recorded with an error marker instead.
export async function buildBackupJson(stamp: string): Promise<{ json: string; filename: string }> {
  const models: Record<string, unknown> = {};
  for (const m of BACKUP_MODELS) {
    try {
      models[m] = await (db as any)[m].findMany();
    } catch {
      models[m] = { error: "unavailable" };
    }
  }
  const json = JSON.stringify({ app: "peyvo", version: 1, exportedAt: stamp, models }, null, 2);
  const filename = `peyvo-backup-${stamp.slice(0, 10)}.json`;
  return { json, filename };
}

// Sends a backup file to a Telegram chat via the Bot API (sendDocument).
// Returns a small result object; never throws — the caller logs/handles.
export async function sendBackupToTelegram(
  botToken: string,
  chatId: string,
  json: string,
  filename: string,
  caption: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    // Blob keeps the JSON as an attached file rather than an inline message.
    form.append("document", new Blob([json], { type: "application/json" }), filename);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
