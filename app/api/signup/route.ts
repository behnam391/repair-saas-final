import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { isPhoneVerifiedForSignup, consumeSignupVerification } from "@/lib/signup-verify";
import { preprocessPhone, normalizeOptionalPhone } from "@/lib/phone";
import { z } from "zod";
import { strongPassword } from "@/lib/security";
import { serializeServiceCategories } from "@/lib/device-category";

const SignupSchema = z.object({
  shopName: z.string().min(2),
  address: z.string().optional(),
  landlinePhone: z.string().optional(),
  businessSize: z.enum(["SOLO", "TEAM", "ENTERPRISE"]).default("SOLO"),
  shopType: z.enum(["REPAIR", "DEALER", "BOTH"]).default("REPAIR"),
  specialties: z.array(z.enum(["HARDWARE", "SOFTWARE", "BOARD"])).default([]),
  serviceCategories: z.array(z.enum(["MOBILE", "COMPUTER"])).min(1).default(["MOBILE"]),
  ownerName: z.string().min(2),
  nationalId: z.string().optional(),
  birthDate: z.string().optional(),
  // Canonical form or the account becomes unreachable at login. See lib/phone.ts.
  phone: z.preprocess(preprocessPhone, z.string().min(5)),
  password: strongPassword,
});

// POST /api/signup — public, no auth required. Anyone can create a new
// shop on the "free" plan; upgrading later goes through /api/billing.
// A shop starts at verification level 1 (just signed up); submitting a
// complete profile bumps it to level 2 (self-declared), and a platform
// admin reviewing/approving it bumps it to level 3 (verified) — see
// /api/verification/request and /api/superadmin/verification.
export async function POST(req: NextRequest) {
  try {
    const body = SignupSchema.parse(await req.json());

    const existing = await db.user.findUnique({ where: { phone: body.phone } });
    if (existing) {
      return NextResponse.json({ error: "phone_taken", message: "این شماره موبایل قبلاً ثبت شده" }, { status: 409 });
    }

    // Require the phone to have been verified via SMS/email code first.
    if (!(await isPhoneVerifiedForSignup(body.phone))) {
      return NextResponse.json({ error: "phone_not_verified", message: "ابتدا شماره موبایل را با کد تأیید، تأیید کنید" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const shop = await db.$transaction(async (tx) => {
      const s = await tx.shop.create({
        data: {
          name: body.shopName,
          type: body.shopType,
          address: body.address,
          landlinePhone: normalizeOptionalPhone(body.landlinePhone),
          businessSize: body.businessSize,
          specialties: body.specialties.join(","),
          serviceCategories: serializeServiceCategories(body.serviceCategories),
          plan: "free",
          monthlyQuota: 10,
        },
      });
      await tx.user.create({
        data: {
          shopId: s.id, name: body.ownerName, phone: body.phone, passwordHash, role: "OWNER",
          nationalId: body.nationalId,
          ...(body.birthDate ? { birthDate: new Date(body.birthDate) } : {}),
        },
      });
      return s;
    });

    await consumeSignupVerification(body.phone);
    return NextResponse.json({ shopId: shop.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
