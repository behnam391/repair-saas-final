import { NextRequest } from "next/server";
import { db } from "./db";

export const EXTERNAL_API_SCOPES = [
  { key: "device_flags", label: "گزارش‌های هشدار دستگاه (مسروقه/بدهی)" },
  { key: "device_transactions", label: "زنجیره مالکیت/خرید و فروش دستگاه" },
  { key: "shop_directory", label: "فهرست و مشخصات مغازه‌های عضو" },
  { key: "shop_verification", label: "وضعیت احراز هویت مغازه‌ها" },
  { key: "ratings", label: "امتیاز و نظرات مشتریان" },
] as const;

export class ExternalAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// Every /api/external/* route calls this first. Adding a brand-new data
// category later just means adding it to EXTERNAL_API_SCOPES and checking
// `scopes.includes("new_category")` in the new route — the key-management
// UI in /superadmin/external-keys already handles any entries in that list
// automatically, no separate admin UI work needed per category.
export async function requireExternalScope(req: NextRequest, scope: string) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) throw new ExternalAuthError("missing_api_key");

  const keyRecord = await db.externalApiKey.findUnique({ where: { apiKey } });
  if (!keyRecord || !keyRecord.active) throw new ExternalAuthError("invalid_api_key");

  const scopes = keyRecord.scopes.split(",").map((s) => s.trim());
  if (!scopes.includes(scope)) throw new ExternalAuthError("scope_not_granted", 403);

  return keyRecord;
}
