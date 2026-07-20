import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/reports/export?type=tickets|invoices|inventory — OWNER-only
// Excel-compatible CSV download (UTF-8 with BOM so Persian text opens
// correctly in Excel; values are quoted/escaped per RFC 4180).
function csv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

function csvResponse(content: string, filename: string) {
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const STATUS_FA: Record<string, string> = {
  PENDING: "در صف", IN_PROGRESS: "در حال انجام", AWAITING_APPROVAL: "منتظر تأیید",
  REFERRED: "ارجاع‌شده", READY: "آماده تحویل", DELIVERED: "تحویل‌شده", CANCELLED: "لغوشده",
};

export async function GET(req: NextRequest) {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);
    const type = req.nextUrl.searchParams.get("type") ?? "invoices";
    const fa = (d: Date) => new Date(d).toLocaleDateString("fa-IR");

    if (type === "tickets") {
      const tickets = await db.ticket.findMany({
        where: { shopId },
        include: { customer: true, assignedTo: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      const rows: (string | number | null | undefined)[][] = [
        ["شماره", "مشتری", "تلفن مشتری", "دستگاه", "IMEI", "شرح مشکل", "بخش", "وضعیت", "تعمیرکار", "هزینه نهایی", "تاریخ پذیرش", "تاریخ تحویل"],
        ...tickets.map((t) => [
          t.no, t.customer.name, t.customer.phone, t.deviceModel, t.imei, t.issueInitial,
          t.lane, STATUS_FA[t.status] ?? t.status, t.assignedTo?.name, t.finalCost,
          fa(t.createdAt), t.deliveredAt ? fa(t.deliveredAt) : "",
        ]),
      ];
      return csvResponse(csv(rows), "tickets.csv");
    }

    if (type === "inventory") {
      const items = await db.inventoryItem.findMany({ where: { shopId }, orderBy: { name: "asc" } });
      const rows: (string | number | null | undefined)[][] = [
        ["نام کالا", "دسته", "مدل سازگار", "موجودی", "قیمت خرید", "قیمت فروش", "ارزش موجودی (خرید)", "وضعیت", "توضیحات"],
        ...items.map((i) => [
          i.name, i.category, i.deviceModel, i.quantity, i.costPrice, i.sellPrice,
          i.quantity * i.costPrice, i.condition === "DEFECTIVE" ? "معیوب" : "سالم", i.description,
        ]),
      ];
      return csvResponse(csv(rows), "inventory.csv");
    }

    // default: invoices
    const invoices = await db.invoice.findMany({
      where: { shopId },
      include: { ticket: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const rows: (string | number | null | undefined)[][] = [
      ["شناسه", "نوع", "مشتری", "دستگاه/کالا", "اجرت", "قطعات/کالا", "مالیات", "جمع کل", "پرداخت", "کد رهگیری آنلاین", "تاریخ"],
      ...invoices.map((inv) => [
        inv.id.slice(0, 8),
        inv.type === "SALE" ? "فروش مستقیم" : "تعمیر",
        inv.ticket?.customer.name ?? inv.customerName,
        inv.ticket ? `${inv.ticket.deviceModel} #${inv.ticket.no}` : "فروش کالا",
        inv.laborCost, inv.partsCost, inv.taxAmount, inv.total,
        inv.paid ? "پرداخت‌شده" : "پرداخت‌نشده", inv.paymentRefId,
        fa(inv.createdAt),
      ]),
    ];
    return csvResponse(csv(rows), "invoices.csv");
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
