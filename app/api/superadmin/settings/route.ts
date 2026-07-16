import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json({ settings: settings ?? {} });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({
  kavenegarApiKey: z.string().optional(),
  kavenegarSender: z.string().optional(),
  zarinpalMerchantId: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramBotUsername: z.string().optional(),
  guideUrl: z.string().optional(),
  aboutUsContent: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromAddress: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = Schema.parse(await req.json());
    const settings = await db.platformSettings.upsert({
      where: { id: "singleton" },
      update: body,
      create: { id: "singleton", ...body },
    });
    return NextResponse.json({ settings });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
