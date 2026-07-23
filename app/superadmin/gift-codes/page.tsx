"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatJalaliDate } from "@/lib/jalali";

const PLAN_LABEL: Record<string, string> = { pro: "حرفه‌ای", business: "تجاری" };

type Code = {
  id: string; code: string; plan: string; months: number; note: string | null;
  redeemedByShopId: string | null; redeemedByShopName: string | null; redeemedAt: string | null; createdAt: string;
};

export default function GiftCodesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<Code[]>([]);
  const [plan, setPlan] = useState("pro");
  const [months, setMonths] = useState(1);
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<string[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load() {
    const res = await fetch("/api/superadmin/gift-codes");
    if (res.ok) setCodes((await res.json()).codes ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setCreating(true);
    const res = await fetch("/api/superadmin/gift-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, months, count, note: note || undefined }),
    });
    setCreating(false);
    if (res.ok) {
      const data = await res.json();
      setJustCreated((data.codes ?? []).map((c: Code) => c.code));
      setNote("");
      load();
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  }

  const unusedCount = codes.filter((c) => !c.redeemedByShopId).length;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">کدهای هدیه اشتراک</h1>
      <p className="text-[11px] text-muted mb-4">
        کد بسازید و به مغازه بدهید؛ مغازه با ثبت آن در بخش «اشتراک و پرداخت»، بدون پرداخت، اشتراک رایگان می‌گیرد.
        ({unusedCount} کد استفاده‌نشده)
      </p>

      {/* Create form */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5 space-y-3">
        <div className="text-sm font-bold">ساخت کد جدید</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-muted mb-1">پلن</label>
            <select className="w-full bg-surface2 rounded-lg px-2 py-2 text-sm" value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="pro">حرفه‌ای</option>
              <option value="business">تجاری</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">مدت (ماه)</label>
            <select className="w-full bg-surface2 rounded-lg px-2 py-2 text-sm" value={months} onChange={(e) => setMonths(+e.target.value)}>
              {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} ماه</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">تعداد کد</label>
            <select className="w-full bg-surface2 rounded-lg px-2 py-2 text-sm" value={count} onChange={(e) => setCount(+e.target.value)}>
              {[1, 5, 10, 20].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="یادداشت (اختیاری) — مثلاً: کمپین نوروز"
          value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={create} disabled={creating}
          className="w-full bg-copper text-white font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
          {creating ? "در حال ساخت..." : "ساخت کد هدیه"}
        </button>

        {justCreated.length > 0 && (
          <div className="bg-teal/10 border border-teal/40 rounded-lg p-3">
            <div className="text-[11px] text-teal font-bold mb-2">✅ {justCreated.length} کد ساخته شد — کپی کنید و به مغازه بدهید:</div>
            <div className="flex flex-wrap gap-2">
              {justCreated.map((c) => (
                <button key={c} onClick={() => copy(c)}
                  className="mono text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 hover:border-copper">
                  {c} {copied === c ? "✓" : "📋"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing codes */}
      <div className="text-sm font-bold mb-2">همه کدها</div>
      <div className="space-y-2">
        {codes.length === 0 && <p className="text-xs text-muted text-center py-6">هنوز کدی ساخته نشده.</p>}
        {codes.map((c) => (
          <div key={c.id} className={`bg-surface2 border rounded-lg p-3 text-xs flex items-center justify-between gap-2 ${c.redeemedByShopId ? "border-surface2 opacity-70" : "border-teal/40"}`}>
            <div className="min-w-0">
              <button onClick={() => copy(c.code)} className="mono font-bold text-sm hover:text-copper">{c.code} {copied === c.code ? "✓" : "📋"}</button>
              <div className="text-muted mt-0.5">
                {PLAN_LABEL[c.plan] ?? c.plan} · {c.months} ماه {c.note ? `· ${c.note}` : ""}
              </div>
            </div>
            <div className="text-left shrink-0">
              {c.redeemedByShopId ? (
                <>
                  <div className="text-danger text-[10px] font-bold">استفاده‌شده</div>
                  <div className="text-muted text-[10px]">{c.redeemedByShopName}</div>
                  {c.redeemedAt && <div className="text-muted text-[10px]">{formatJalaliDate(c.redeemedAt)}</div>}
                </>
              ) : (
                <div className="text-teal text-[10px] font-bold">استفاده‌نشده</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
