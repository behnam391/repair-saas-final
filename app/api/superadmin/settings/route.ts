import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { encryptSecretOrPassthrough, PLATFORM_SECRET_FIELDS } from "@/lib/crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Secret values are NEVER returned to the client. Instead each secret field is
// blanked and a companion boolean `<field>Set` reports whether a value exists.
// The settings UI shows an empty input (so nothing sensitive is rendered) and
// can indicate "configured" from the flag.
function redactSecrets(settings: any): any {
  const safe: any = { ...(settings ?? {}) };
  for (const f of PLATFORM_SECRET_FIELDS) {
    safe[`${f}Set`] = !!(settings as any)?.[f];
    safe[f] = "";
  }
  return safe;
}

export async function GET() {
  try {
    await requireSuperAdmin("settings");
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json({ settings: redactSecrets(settings) });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({
  kavenegarApiKey: z.string().optional(),
  kavenegarSender: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  telegramBackupEnabled: z.boolean().optional(),
  telegramBackupHour: z.number().int().min(0).max(23).optional(),
  androidApkUrl: z.string().optional(),
  bazaarUrl: z.string().optional(),
  myketUrl: z.string().optional(),
  bazaarRsaPublicKey: z.string().max(10000).optional(),
  bazaarDynamicDiscountKey: z.string().max(2000).optional(),
  myketRsaPublicKey: z.string().max(10000).optional(),
  myketAccessToken: z.string().max(4000).optional(),
  smsUseLookup: z.boolean().optional(),
  kavenegarOtpTemplate: z.string().optional(),
  kavenegarIntakeTemplate: z.string().optional(),
  kavenegarReadyTemplate: z.string().optional(),
  zarinpalMerchantId: z.string().optional(),
  paymentProvider: z.enum(["zarinpal", "zibal", "nextpay"]).optional(),
  zibalMerchant: z.string().optional(),
  nextpayApiKey: z.string().optional(),
  guideUrl: z.string().optional(),
  aboutUsContent: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromAddress: z.string().optional(),
  neshanApiKey: z.string().optional(),
  enamadId: z.string().optional(),
  enamadCode: z.string().optional(),
  fontFamily: z.string().optional(),
  defaultTheme: z.enum(["dark", "light"]).optional(),
  // Subscription pricing (toman) and duration discounts (percent).
  proPriceToman: z.number().int().min(0).optional(),
  businessPriceToman: z.number().int().min(0).optional(),
  proQuota: z.number().int().min(0).optional(),
  businessQuota: z.number().int().min(0).optional(),
  discount3: z.number().int().min(0).max(100).optional(),
  discount6: z.number().int().min(0).max(100).optional(),
  discount12: z.number().int().min(0).max(100).optional(),
  // ── AI provider configuration ──
  aiEnabled: z.boolean().optional(),
  aiProvider: z.enum(["disabled", "mock", "openai-compat"]).optional(),
  aiBaseUrl: z.string().max(2000).optional(),
  aiApiKey: z.string().max(4000).optional(),
  aiModel: z.string().max(200).optional(),
  aiFallbackProvider: z.string().max(40).optional(), // "" | disabled | mock | openai-compat
  aiFallbackBaseUrl: z.string().max(2000).optional(),
  aiFallbackApiKey: z.string().max(4000).optional(),
  aiFallbackModel: z.string().max(200).optional(),
  aiTimeoutMs: z.number().int().min(1000).max(120000).optional(),
  aiMaxRetries: z.number().int().min(0).max(10).optional(),
  aiShopDailyLimit: z.number().int().min(0).max(1000000).optional(),
});

// AI config fields whose CHANGES are audited (names only — never values).
const AI_CONFIG_FIELDS = [
  "aiEnabled", "aiProvider", "aiBaseUrl", "aiApiKey", "aiModel",
  "aiFallbackProvider", "aiFallbackBaseUrl", "aiFallbackApiKey", "aiFallbackModel",
  "aiTimeoutMs", "aiMaxRetries", "aiShopDailyLimit",
] as const;
const AI_SECRET_FIELDS = ["aiApiKey", "aiFallbackApiKey"];

export async function PATCH(req: NextRequest) {
  try {
    const { adminId } = await requireSuperAdmin("settings");
    const body = Schema.parse(await req.json());

    // Encrypt any secret field that carries a new value; SKIP secret fields
    // that are absent or empty so saving other settings never wipes an
    // existing secret (the GET blanks secrets, so a normal round-trip sends
    // them back empty). Non-secret fields pass through unchanged.
    const data: Record<string, unknown> = { ...body };
    for (const f of PLATFORM_SECRET_FIELDS) {
      const v = (body as any)[f];
      if (v === undefined || v === "") {
        delete data[f];
        continue;
      }
      data[f] = encryptSecretOrPassthrough(String(v));
    }

    // Snapshot the prior AI values so the audit records only real changes.
    const prior = await db.platformSettings.findUnique({ where: { id: "singleton" } });

    const settings = await db.platformSettings.upsert({
      where: { id: "singleton" },
      update: data as any,
      create: { id: "singleton", ...data } as any,
    });

    // Audit any AI-config change — record the changed field NAMES only. For
    // secret fields, a change counts only when a real (non-empty) value was
    // sent; the value (API key) itself is NEVER logged. Non-secret fields are
    // compared against the stored value so an unrelated save is not audited.
    // Best-effort: never blocks the save.
    const changedAiFields = AI_CONFIG_FIELDS.filter((f) => {
      const v = (body as any)[f];
      if (v === undefined) return false;
      if (AI_SECRET_FIELDS.includes(f)) return v !== "";
      return !prior || (prior as any)[f] !== v;
    });
    if (changedAiFields.length > 0) {
      try {
        await (db as any).aiConfigAudit.create({
          data: { adminId, changedFields: changedAiFields.join(",") },
        });
      } catch (e) {
        console.error("[ai] config audit write failed", e);
      }
    }

    return NextResponse.json({ settings: redactSecrets(settings) });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
