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
    await requireSuperAdmin();
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
  androidApkUrl: z.string().optional(),
  bazaarUrl: z.string().optional(),
  myketUrl: z.string().optional(),
  bazaarRsaPublicKey: z.string().max(10000).optional(),
  bazaarDynamicDiscountKey: z.string().max(2000).optional(),
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
});

export async function PATCH(req: NextRequest) {
  try {
    await requireSuperAdmin();
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

    const settings = await db.platformSettings.upsert({
      where: { id: "singleton" },
      update: data as any,
      create: { id: "singleton", ...data } as any,
    });
    return NextResponse.json({ settings: redactSecrets(settings) });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
