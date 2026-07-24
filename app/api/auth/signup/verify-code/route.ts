import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  phone: z.string().regex(/^09\d{9}$/),
  code: z.string().min(4).max(6),
});

// POST /api/auth/signup/verify-code — checks the code for a phone and marks
// the pending verification as verified, so the signup endpoint will accept
// this phone. Does NOT create any account.
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = Schema.parse(await req.json());
    const rec = await db.signupVerification.findFirst({
      where: { identifier: phone, code: code.trim() },
      orderBy: { createdAt: "desc" },
    });
    if (!rec) return NextResponse.json({ message: "کد وارد شده نادرست است" }, { status: 400 });
    if (rec.expiresAt < new Date()) return NextResponse.json({ message: "کد منقضی شده — دوباره کد بگیرید" }, { status: 400 });

    await db.signupVerification.update({ where: { id: rec.id }, data: { verified: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ message: "ورودی نامعتبر" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
