import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { sendSms, sendIntakeSms, intakeReceivedMessage } from "@/lib/sms";
import { preprocessPhone } from "@/lib/phone";
import { encryptSecretOrPassthrough } from "@/lib/crypto";
import { parseServiceCategories } from "@/lib/device-category";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateTicketSchema = z.object({
  customerName: z.string().optional().default(""),
  // Every repair-status SMS goes here. A number stored as ۰۹… is not a
  // number Kavenegar can deliver to. See lib/phone.ts.
  customerPhone: z.preprocess(preprocessPhone, z.string().optional().default("")),
  deviceModel: z.string().min(1),
  deviceCategory: z.enum(["MOBILE", "COMPUTER"]).default("MOBILE"),
  deviceType: z.enum(["LAPTOP", "DESKTOP", "ALL_IN_ONE", "MINI_PC", "OTHER"]).optional(),
  deviceBrand: z.string().max(80).optional(),
  operatingSystem: z.string().max(80).optional(),
  accessories: z.string().max(300).optional(),
  imei: z.string().optional(),
  issueInitial: z.string().min(1),
  lane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]),
  estimatedCost: z.number().int().optional(),
  devicePasscode: z.string().optional(),
  devicePasscodeType: z.enum(["PIN", "PASSWORD", "PATTERN"]).optional(),
  customerDamageNotes: z.string().optional(),
  receiptAck: z.enum(["SHOP_PRINTED_SIGNED", "SITE_PRINTED_SIGNED", "NO_SIGNATURE"]).optional(),
  intakeSource: z.enum(["CUSTOMER", "PARTNER"]).default("CUSTOMER"),
  partnerName: z.string().max(120).optional(),
  partnerPhone: z.preprocess(preprocessPhone, z.string().optional()),
});

// GET /api/tickets?lane=HARDWARE&status=PENDING
// Always scoped to the signed-in user's shop. Specialist technicians
// (HARDWARE/SOFTWARE/BOARD) only see tickets that are theirs — either
// already assigned to them, or still unassigned and sitting in their own
// lane waiting to be picked up. Owners and front-desk staff see everything,
// since they coordinate across the whole shop.
export async function GET(req: NextRequest) {
  try {
    const { shopId, userId, role } = await requireSession();
    const { searchParams } = new URL(req.url);
    const lane = searchParams.get("lane");
    const status = searchParams.get("status");
    const deviceCategory = searchParams.get("deviceCategory");

    const isSpecialist = ["HARDWARE", "SOFTWARE", "BOARD"].includes(role);

    const tickets = await db.ticket.findMany({
      where: {
        shopId,
        ...(lane ? { lane: lane as any } : {}),
        ...(deviceCategory === "MOBILE" || deviceCategory === "COMPUTER" ? { deviceCategory } : {}),
        // The active board (this endpoint's main use, from tickets/page.tsx)
        // only ever asks for lane/no status filter — so by default, hide
        // tickets that already left the workflow (delivered or cancelled).
        // Without this, a delivered ticket's lane stays "READY" forever
        // and it would never disappear from the "آماده تحویل" column.
        // Passing an explicit ?status= (e.g. the history/search page)
        // always wins and is never restricted here.
        ...(status ? { status: status as any } : { status: { notIn: ["DELIVERED", "CANCELLED"] } }),
        ...(isSpecialist
          ? { OR: [{ assignedToId: userId }, { assignedToId: null, lane: role as any }] }
          : {}),
      },
      include: {
        customer: true,
        assignedTo: true,
        invoice: true,
        history: { orderBy: { createdAt: "asc" }, include: { tech: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Never ship the (encrypted) passcode in the bulk board list. Expose only a
    // boolean so the UI can offer a "reveal" button that goes through the
    // audited GET /api/tickets/:id/passcode. devicePasscodeType is retained for
    // the button label (the type alone is not the secret).
    const safeTickets = tickets.map((t) => {
      const { devicePasscode, ...rest } = t as any;
      return { ...rest, hasPasscode: !!devicePasscode };
    });

    return NextResponse.json({ tickets: safeTickets });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/tickets — device intake.
export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    const body = CreateTicketSchema.parse(await req.json());
    const partnerWithoutCustomer = body.intakeSource === "PARTNER" && (!body.customerName.trim() || !body.customerPhone);
    if (body.intakeSource === "PARTNER" && !body.partnerName?.trim()) {
      return NextResponse.json({ message: "نام همکار تحویل‌دهنده را وارد کنید" }, { status: 400 });
    }
    if (body.intakeSource === "CUSTOMER" && (!body.customerName.trim() || !body.customerPhone)) {
      return NextResponse.json({ message: "نام و شماره تماس مشتری را وارد کنید" }, { status: 400 });
    }

    // Enforce the shop's monthly intake quota (applies to every plan;
    // paid plans just get a much higher monthlyQuota set at checkout).
    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
    if (!shop.active) {
      return NextResponse.json(
        { error: "shop_suspended", message: "حساب این مغازه توسط مدیریت سیستم موقتاً غیرفعال شده است." },
        { status: 403 }
      );
    }
    const enabledCategories = parseServiceCategories(shop.serviceCategories);
    if (!enabledCategories.includes(body.deviceCategory)) {
      return NextResponse.json({ message: "این نوع دستگاه در تنظیمات تعمیرگاه فعال نیست" }, { status: 400 });
    }
    {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const countThisMonth = await db.ticket.count({
        where: { shopId, createdAt: { gte: startOfMonth } },
      });
      if (countThisMonth >= shop.monthlyQuota) {
        return NextResponse.json(
          { error: "quota_exceeded", message: "سهمیه این ماه تمام شده. برای ادامه، اشتراک خود را ارتقا دهید." },
          { status: 402 }
        );
      }
    }

    const result = await db.$transaction(async (tx) => {
      // A partner intake deliberately has no customer fields in the form.
      // The delivering partner becomes the ticket's contact, preserving the
      // existing required Customer relation without inventing fake people.
      const contactName = partnerWithoutCustomer ? body.partnerName!.trim() : body.customerName.trim();
      const contactPhone = partnerWithoutCustomer
        ? (body.partnerPhone || `PARTNER-${body.partnerName!.trim()}`)
        : body.customerPhone;
      // Find-or-create the customer by phone within this shop.
      let customer = await tx.customer.findFirst({
        where: { shopId, phone: contactPhone },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: { shopId, name: contactName, phone: contactPhone },
        });
      }

      // Ticket numbers are sequential per-shop, not global.
      const last = await tx.ticket.findFirst({
        where: { shopId },
        orderBy: { no: "desc" },
        select: { no: true },
      });
      const nextNo = (last?.no ?? 1000) + 1;

      const ticket = await tx.ticket.create({
        data: {
          shopId,
          no: nextNo,
          customerId: customer.id,
          deviceModel: body.deviceModel,
          deviceCategory: body.deviceCategory,
          deviceType: body.deviceCategory === "COMPUTER" ? body.deviceType : undefined,
          deviceBrand: body.deviceBrand?.trim() || undefined,
          operatingSystem: body.deviceCategory === "COMPUTER" ? body.operatingSystem?.trim() || undefined : undefined,
          accessories: body.deviceCategory === "COMPUTER" ? body.accessories || undefined : undefined,
          imei: body.imei,
          issueInitial: body.issueInitial,
          lane: body.lane,
          status: "PENDING",
          estimatedCost: body.estimatedCost,
          // Stored ENCRYPTED at rest (lib/crypto.ts); revealed only via
          // GET /api/tickets/:id/passcode with an audit-logged access.
          devicePasscode: body.devicePasscode ? encryptSecretOrPassthrough(body.devicePasscode) : undefined,
          devicePasscodeType: body.devicePasscodeType,
          customerDamageNotes: body.customerDamageNotes,
          receiptAck: body.receiptAck,
          intakeSource: body.intakeSource,
          partnerName: body.partnerName?.trim() || undefined,
          partnerPhone: body.partnerPhone || undefined,
          history: {
            create: [
              { lane: body.lane, action: body.deviceCategory === "COMPUTER" ? "پذیرش کامپیوتر" : "پذیرش موبایل", techId: userId, note: body.issueInitial },
              { lane: body.lane, action: `ارجاع به ${laneLabel(body.lane)}`, techId: userId },
            ],
          },
        },
        include: { customer: true, history: true },
      });

      return ticket;
    });

    // Confirmation SMS at intake — mirrors the "ready" / "delivered"
    // notifications so the customer is kept in the loop from the very
    // first moment. Never let an SMS hiccup fail the intake itself.
    try {
      if (partnerWithoutCustomer) {
        return NextResponse.json({ ticket: result }, { status: 201 });
      }
      await sendIntakeSms(result.customer.phone, {
        shopName: shop.name,
        ticketNo: result.no,
        shopPhone: shop.phone,
        fallback: intakeReceivedMessage(shop.name, result.customer.name, result.no, {
          deviceModel: result.deviceModel,
          shopPhone: shop.phone,
        }),
      });
    } catch (smsErr) {
      console.error("[sms] failed to send intake confirmation", smsErr);
    }

    return NextResponse.json({ ticket: result }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

function laneLabel(lane: string) {
  return { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی (برد/هارد)" }[lane] ?? lane;
}
