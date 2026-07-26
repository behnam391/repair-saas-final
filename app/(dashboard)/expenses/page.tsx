"use client";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatJalaliDate } from "@/lib/jalali";
import JalaliDatePicker from "@/components/JalaliDatePicker";

const CATEGORY_LABEL: Record<string, string> = {
  RENT: "اجاره", WAGE: "حقوق و دستمزد", PARTS: "خرید قطعه/جنس", UTILITY: "قبوض (برق/آب/تلفن)", OTHER: "متفرقه",
};

type MonthBucket = { label: string; income: number; expense: number; net: number };
type ExpenseRow = { id: string; amount: number; category: string; note?: string | null; createdByName: string; spentAt: string };

export default function ExpensesPage() {
  const { data: session } = useSession();
  const isOwner = (session?.user as any)?.role === "OWNER";

  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("OTHER");
  const [note, setNote] = useState("");
  const [spentAt, setSpentAt] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/expenses");
    if (res.ok) {
      const d = await res.json();
      setMonths(d.months ?? []);
      setExpenses(d.expenses ?? []);
    }
    setLoading(false);
  }
  useEffect(() => { if (isOwner) load(); }, [isOwner]);

  async function addExpense() {
    setErr("");
    if (!amount || amount <= 0) { setErr("مبلغ را وارد کنید"); return; }
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, category, note: note || undefined, spentAt: spentAt || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.message || "ثبت هزینه ناموفق بود"); return; }
    setAmount(0); setNote(""); setSpentAt(""); setCategory("OTHER");
    load();
  }

  async function removeExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  if (!isOwner) {
    return <div className="p-4 text-sm text-muted text-center">این بخش فقط برای مدیر مغازه در دسترس است.</div>;
  }

  const current = months[months.length - 1];
  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">دخل و خرج</h1>
      <p className="text-xs text-muted mb-5">درآمد (از فاکتورها) در برابر هزینه‌ها — تا سود واقعی مغازه را ببینید، نه فقط فروش.</p>

      {loading ? (
        <p className="text-muted text-sm text-center py-10">در حال بارگذاری...</p>
      ) : (
        <>
          {/* Current-month summary */}
          {current && (
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-surface border border-teal/40 rounded-xl p-3 text-center">
                <div className="text-[10px] text-muted mb-1">درآمد این ماه</div>
                <div className="mono text-sm font-bold text-teal">{current.income.toLocaleString("fa-IR")}</div>
              </div>
              <div className="bg-surface border border-danger/40 rounded-xl p-3 text-center">
                <div className="text-[10px] text-muted mb-1">هزینه این ماه</div>
                <div className="mono text-sm font-bold text-danger">{current.expense.toLocaleString("fa-IR")}</div>
              </div>
              <div className={`bg-surface border rounded-xl p-3 text-center ${current.net >= 0 ? "border-copper" : "border-danger"}`}>
                <div className="text-[10px] text-muted mb-1">سود خالص</div>
                <div className={`mono text-sm font-bold ${current.net >= 0 ? "text-copper" : "text-danger"}`}>{current.net.toLocaleString("fa-IR")}</div>
              </div>
            </div>
          )}

          {/* 6-month income vs expense bars */}
          {months.length > 0 && (
            <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5">
              <div className="text-xs font-bold mb-3">۶ ماه اخیر</div>
              <div className="space-y-2.5">
                {months.map((m) => (
                  <div key={m.label} className="text-[11px]">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted">{m.label}</span>
                      <span className={`mono ${m.net >= 0 ? "text-teal" : "text-danger"}`}>خالص: {m.net.toLocaleString("fa-IR")}</span>
                    </div>
                    <div className="flex items-center gap-1 h-2 mb-0.5">
                      <div className="bg-teal rounded-full h-full" style={{ width: `${(m.income / maxBar) * 100}%` }} title="درآمد" />
                    </div>
                    <div className="flex items-center gap-1 h-2">
                      <div className="bg-danger rounded-full h-full" style={{ width: `${(m.expense / maxBar) * 100}%` }} title="هزینه" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-3 text-[10px] text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal inline-block" /> درآمد</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" /> هزینه</span>
              </div>
            </div>
          )}

          {/* Add expense */}
          <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5">
            <div className="text-xs font-bold mb-3">ثبت هزینه جدید</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[10px] text-muted mb-1">مبلغ (تومان)</label>
                <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm"
                  value={amount || ""} onChange={(e) => setAmount(num(e.target.value))} />
              </div>
              <div>
                <label className="block text-[10px] text-muted mb-1">دسته</label>
                <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-[10px] text-muted mb-1">تاریخ (اختیاری — پیش‌فرض امروز)</label>
              <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" value={spentAt} onChange={setSpentAt} />
            </div>
            <div className="mb-2">
              <label className="block text-[10px] text-muted mb-1">توضیح (اختیاری)</label>
              <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: اجاره تیر ماه" />
            </div>
            {err && <p className="text-danger text-xs mb-2">{err}</p>}
            <button onClick={addExpense} disabled={saving} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
              {saving ? "در حال ثبت..." : "ثبت هزینه"}
            </button>
          </div>

          {/* Recent expenses */}
          <div className="text-xs font-bold mb-2">هزینه‌های اخیر</div>
          {expenses.length === 0 ? (
            <p className="text-xs text-muted">هنوز هزینه‌ای ثبت نشده.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((ex) => (
                <div key={ex.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold">{CATEGORY_LABEL[ex.category] ?? ex.category}</span>
                    {ex.note && <span className="text-muted"> · {ex.note}</span>}
                    <div className="text-[10px] text-muted mt-0.5">{formatJalaliDate(ex.spentAt)} · {ex.createdByName}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="mono text-danger font-bold">{ex.amount.toLocaleString("fa-IR")}</span>
                    <button onClick={() => removeExpense(ex.id)} className="text-muted hover:text-danger text-[10px]">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
