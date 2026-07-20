import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
  password: z.string().min(6),
  email: z.string().email("ایمیل معتبر نیست").optional().or(z.literal("")),
  province: z.string().optional(),
  city: z.string().optional(),
});

// POST /api/customer/signup — public. Creates a nationwide PlatformCustomer
// account (NOT a shop, NOT shop staff). The phone must not already belong
// to another customer account; it MAY match a shop staff phone — the two
// login systems are fully independent.
export async function POST(req: NextRequest) {
  try {
    const { name, phone, password, email, province, city } = Schema.parse(await req.json());

    const existing = await db.platformCustomer.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "phone_taken", message: "این شماره قبلاً ثبت‌نام کرده است" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await db.platformCustomer.create({
      data: { name, phone, passwordHash, email: email || null, province: province || null, city: city || null },
    });

    return NextResponse.json({ ok: true, customerId: customer.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_input", message: e.errors[0]?.message ?? "ورودی نامعتبر" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
