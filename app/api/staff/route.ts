import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const StaffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  password: z.string().min(4),
  role: z.enum(["OWNER", "FRONTDESK", "HARDWARE", "SOFTWARE", "BOARD"]),
  avatarUrl: z.string().optional(),
  email: z.string().optional(),
  gmailId: z.string().optional(),
  telegramId: z.string().optional(),
  notifyEmail: z.boolean().optional(),
  notifyTelegram: z.boolean().optional(),
});

// GET /api/staff — list everyone on the shop's team.
export async function GET() {
  try {
    const { shopId } = await requireSession();
    const staff = await db.user.findMany({
      where: { shopId },
      select: {
        id: true, name: true, phone: true, role: true, active: true, createdAt: true,
        avatarUrl: true, email: true, gmailId: true, telegramId: true, notifyEmail: true, notifyTelegram: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ staff });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/staff — only the shop owner can add new team members.
export async function POST(req: NextRequest) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const body = StaffSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(body.password, 10);
    const { password, ...profile } = body;

    const user = await db.user.create({
      data: { shopId, ...profile, passwordHash },
      select: { id: true, name: true, phone: true, role: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    if ((e as any)?.code === "P2002") {
      return NextResponse.json({ error: "phone_taken", message: "این شماره موبایل قبلاً ثبت شده" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
