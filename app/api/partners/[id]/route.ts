import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeOptionalPhone } from "@/lib/phone";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

const Schema = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().optional(), address: z.string().max(300).optional(), note: z.string().max(500).optional() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    const current = await db.partnerContact.findFirst({ where: { id: params.id, shopId } });
    if (!current) return NextResponse.json({ message: "همکار پیدا نشد" }, { status: 404 });
    const body = Schema.parse(await req.json());
    const partner = await db.partnerContact.update({ where: { id: current.id }, data: { name: body.name, phone: normalizeOptionalPhone(body.phone), address: body.address?.trim() || null, note: body.note?.trim() || null } });
    return NextResponse.json({ partner });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: "اطلاعات همکار معتبر نیست" }, { status: 400 });
    console.error(error); return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    const current = await db.partnerContact.findFirst({ where: { id: params.id, shopId } });
    if (!current) return NextResponse.json({ message: "همکار پیدا نشد" }, { status: 404 });
    await db.partnerContact.delete({ where: { id: current.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(error); return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
