import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, UnauthorizedError } from "@/lib/tenant";
import { lastJalaliMonths, toJalaliYMD, jalaliToGregorianDate } from "@/lib/jalali";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CATEGORIES = ["RENT", "WAGE", "PARTS", "UTILITY", "OTHER"] as const;

const CreateSchema = z.object({
  amount: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  note: z.string().optional(),
  spentAt: z.string().optional(), // ISO date; defaults to now
});

// GET /api/expenses — OWNER-only cash book. Returns the last 6 Jalali
// months as income-vs-expense-vs-net buckets (income comes from Invoice
// totals, the expense side from this shop's Expense rows) plus the recent
// expense list. This is the full "دخل و خرج" picture — real profit, not
// just revenue.
export async function GET() {
  try {
    const { shopId, role } = await requireSession();
    requireRole(role, ["OWNER"]);

    const buckets = lastJalaliMonths(6).map((m) => ({ ...m, income: 0, expense: 0 }));
    const start = jalaliToGregorianDate(buckets[0].jy, buckets[0].jm, 1);
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    const [invoices, expenseRows] = await Promise.all([
      db.invoice.findMany({ where: { shopId, createdAt: { gte: start } }, select: { total: true, createdAt: true } }),
      (db as any).expense.findMany({
        where: { shopId },
        orderBy: { spentAt: "desc" },
        take: 100,
        select: { id: true, amount: true, category: true, note: true, createdByName: true, spentAt: true },
      }),
    ]);

    for (const inv of invoices) {
      const { jy, jm } = toJalaliYMD(inv.createdAt);
      const b = byKey.get(`${jy}-${jm}`);
      if (b) b.income += inv.total;
    }
    for (const ex of expenseRows as any[]) {
      const { jy, jm } = toJalaliYMD(ex.spentAt);
      const b = byKey.get(`${jy}-${jm}`);
      if (b) b.expense += ex.amount;
    }

    return NextResponse.json({
      months: buckets.map(({ label, income, expense }) => ({ label, income, expense, net: income - expense })),
      expenses: expenseRows,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// POST /api/expenses — log a new expense (OWNER-only).
export async function POST(req: NextRequest) {
  try {
    const { shopId, role, name } = await requireSession();
    requireRole(role, ["OWNER"]);
    const body = CreateSchema.parse(await req.json());

    const expense = await (db as any).expense.create({
      data: {
        shopId,
        amount: body.amount,
        category: body.category,
        note: body.note,
        createdByName: name,
        ...(body.spentAt ? { spentAt: new Date(body.spentAt) } : {}),
      },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", message: "ورودی نامعتبر" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
