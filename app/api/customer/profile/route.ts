import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer, UnauthorizedError } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  province: z.string().optional(),
  city: z.string().optional(),
  // optional password change, requires the current password
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET() {
  try {
    const { customerId } = await requireCustomer();
    const customer = await db.platformCustomer.findUniqueOrThrow({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true, province: true, city: true, createdAt: true },
    });
    return NextResponse.json({ customer });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { customerId } = await requireCustomer();
    const { name, email, province, city, currentPassword, newPassword } = Schema.parse(await req.json());

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email || null;
    if (province !== undefined) data.province = province || null;
    if (city !== undefined) data.city = city || null;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "current_password_required", message: "برای تغییر رمز، رمز فعلی لازم است" }, { status: 400 });
      }
      const customer = await db.platformCustomer.findUniqueOrThrow({ where: { id: customerId } });
      const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "wrong_password", message: "رمز فعلی اشتباه است" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await db.platformCustomer.update({
      where: { id: customerId },
      data,
      select: { id: true, name: true, phone: true, email: true, province: true, city: true },
    });
    return NextResponse.json({ customer: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
