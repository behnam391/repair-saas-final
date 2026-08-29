import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeOptionalPhone } from "@/lib/phone";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";
const CreateSchema = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().optional(), address: z.string().max(300).optional(), note: z.string().max(500).optional() });
type ContactRow = { id: string; name: string; phone: string; address: string; note: string; source: "LINKED" | "MANUAL" | "HISTORY"; linkedShopId?: string };

export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
    const q = new URL(req.url).searchParams.get("q")?.trim().toLocaleLowerCase("fa") ?? "";
    const [manual, links, history] = await Promise.all([
      db.partnerContact.findMany({ where: { shopId }, orderBy: { updatedAt: "desc" }, take: 200 }),
      db.shopPartnership.findMany({
        where: { status: "ACCEPTED", OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] },
        include: {
          requestedByShop: { select: { id: true, name: true, phone: true, address: true, province: true } },
          targetShop: { select: { id: true, name: true, phone: true, address: true, province: true } },
        },
      }),
      db.ticket.findMany({ where: { shopId, partnerName: { not: null } }, select: { partnerName: true, partnerPhone: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    ]);
    const rows: ContactRow[] = [];
    for (const link of links) {
      const other = link.requestedByShopId === shopId ? link.targetShop : link.requestedByShop;
      rows.push({ id: `linked:${other.id}`, linkedShopId: other.id, name: other.name, phone: other.phone ?? "", address: other.address ?? other.province ?? "", note: "همکاری فعال در پیوو", source: "LINKED" });
    }
    for (const item of manual) rows.push({ id: item.id, name: item.name, phone: item.phone ?? "", address: item.address ?? "", note: item.note ?? "", source: "MANUAL" });
    for (const item of history) if (item.partnerName?.trim()) rows.push({ id: `history:${item.partnerName}:${item.partnerPhone ?? ""}`, name: item.partnerName.trim(), phone: item.partnerPhone ?? "", address: "", note: "ثبت‌شده از پذیرش قبلی", source: "HISTORY" });
    const seen = new Set<string>();
    const partners = rows.filter((item) => {
      const key = item.phone || item.name.toLocaleLowerCase("fa");
      if (seen.has(key)) return false;
      seen.add(key);
      return !q || `${item.name} ${item.phone} ${item.address}`.toLocaleLowerCase("fa").includes(q);
    });
    return NextResponse.json({ partners, total: partners.length });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(error); return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
    const body = CreateSchema.parse(await req.json());
    const phone = normalizeOptionalPhone(body.phone);
    if (phone && await db.partnerContact.findFirst({ where: { shopId, phone } })) return NextResponse.json({ message: "این شماره قبلاً ثبت شده است" }, { status: 409 });
    const partner = await db.partnerContact.create({ data: { shopId, name: body.name, phone, address: body.address?.trim() || null, note: body.note?.trim() || null } });
    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: "نام همکار را وارد کنید" }, { status: 400 });
    console.error(error); return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
