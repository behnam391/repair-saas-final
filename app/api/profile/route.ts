import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  avatarUrl: z.string().optional(),
  email: z.string().optional(),
  gmailId: z.string().optional(),
  telegramId: z.string().optional(),
  nationalId: z.string().optional(),
  birthDate: z.string().optional(), // ISO date string, e.g. "1990-05-12"
  notifyEmail: z.boolean().optional(),
  notifyTelegram: z.boolean().optional(),
});

export async function GET() {
  try {
    const { userId } = await requireSession();
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, name: true, phone: true, avatarUrl: true, email: true, gmailId: true, telegramId: true,
        nationalId: true, birthDate: true, notifyEmail: true, notifyTelegram: true,
      },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { birthDate, ...rest } = Schema.parse(await req.json());
    const user = await db.user.update({
      where: { id: userId },
      data: { ...rest, ...(birthDate ? { birthDate: new Date(birthDate) } : {}) },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
