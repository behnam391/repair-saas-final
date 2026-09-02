import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { preprocessPhone } from "@/lib/phone";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().optional(),
  phone: z.preprocess(preprocessPhone, z.string().min(5).optional()),
  email: z.string().optional(),
  gmailId: z.string().optional(),
  nationalId: z.string().optional(),
  birthDate: z.string().optional(), // ISO date string, e.g. "1990-05-12"
  notifyEmail: z.boolean().optional(),
  // Self-service specialty: lets an owner mark which repair lane they
  // personally work in without needing a second person to edit them.
  specialty: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]).nullable().optional(),
});

export async function GET() {
  try {
    const { userId } = await requireSession();
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, name: true, phone: true, avatarUrl: true, email: true, gmailId: true,
        nationalId: true, birthDate: true, notifyEmail: true, specialty: true, role: true,
      } as any,
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[profile/GET]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { birthDate, phone, ...rest } = Schema.parse(await req.json());

    if (phone) {
      const clash = await db.user.findFirst({ where: { phone, id: { not: userId } } });
      if (clash) return NextResponse.json({ message: "این شماره موبایل قبلاً ثبت شده است" }, { status: 409 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { ...rest, ...(phone ? { phone } : {}), ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}) } as any,
      select: { id: true, name: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", message: "اطلاعات واردشده معتبر نیست" }, { status: 400 });
    console.error("[profile/PATCH]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
