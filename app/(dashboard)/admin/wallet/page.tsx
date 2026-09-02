"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatJalaliDateTime } from "@/lib/jalali";
import { getNativeStore } from "@/lib/myket-billing-client";

const QUICK = [100000, 200000, 500000, 1000000];

// Normalize an amount field to plain English digits (the app allows Persian
// digit entry via DigitInputFixer; here we also strip separators/spaces).
function toEnDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d]/g, "");
}

type Txn = {
  id: string; type: string; amount: number; status: string;
  note: string | null; balanceAfter: number | null; createdAt: string;
};

const TYPE_LABEL: Record<string, string> = { TOPUP: "شارژ کیف پول", SPEND: "پرداخت اشتراک", REFUND: "بازگشت وجه" };
const STATUS_LABEL: Record<string, string> = { PAID: "موفق", PENDING: "در انتظار پرداخت", FAILED: "ناموفق" };

export default function WalletPage() {
  const params = useSearchParams();
  const result = params.get("result");
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storeMode, setStoreMode] = useState<"checking" | "web" | "myket" | "bazaar" | "native">("checking");

  async function load() {
    const res = await fetch("/api/wallet");
    if (res.ok) {
      const d = await res.json();
      setBalance(d.balance ?? 0);
      setTxns(d.transactions ?? []);
    }
  }
  useEffect(() => {
    getNativeStore().then((mode) => {
      setStoreMode(mode);
      if (mode === "web") load();
    });
  }, []);

  const amountNum = parseInt(toEnDigits(amount) || "0", 10);

  async function topup() {
    setError("");
    if (amountNum < 10000) { setError("حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است."); return; }
    setLoading(true);
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountToman: amountNum }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.message || "شروع پرداخت ناموفق بود"); return; }
    window.location.href = d.payUrl;
  }

  if (storeMode === "checking") {
    return <div className="p-6 text-center text-xs text-muted">در حال بررسی روش پرداخت...</div>;
  }

  if (storeMode === "myket" || storeMode === "bazaar" || storeMode === "native") {
    return (
      <div className="workspace-page p-4 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-teal/15 to-surface border border-teal/40 rounded-2xl p-6 text-center mt-6">
          <div className="text-3xl mb-3">🟢</div>
          <h1 className="display-heading text-lg mb-2">{storeMode === "native" ? "پرداخت فروشگاهی در دسترس نیست" : `پرداخت امن ${storeMode === "bazaar" ? "بازار" : "مایکت"}`}</h1>
          <p className="text-xs text-muted leading-6 mb-5">
            {storeMode === "native"
              ? "فروشگاه نصب‌کننده شناسایی نشد. برنامه را از صفحه رسمی همان فروشگاه نصب و دوباره اجرا کنید؛ هیچ روش پرداخت جایگزینی در نسخه فروشگاهی نمایش داده نمی‌شود."
              : "در نسخه فروشگاهی، خرید و تمدید اشتراک فقط از طریق پرداخت درون‌برنامه‌ای همان فروشگاه انجام می‌شود و شارژ مستقیم کیف پول در دسترس نیست."}
          </p>
          {storeMode !== "native" && <a href="/admin/billing" className="inline-flex bg-teal text-white font-bold rounded-xl px-5 py-2.5 text-sm">
            مشاهده پلن‌ها و خرید از {storeMode === "bazaar" ? "بازار" : "مایکت"}
          </a>}
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page p-4 max-w-4xl mx-auto">
      <h1 className="display-heading text-lg mb-1">کیف پول</h1>
      <p className="text-xs text-muted mb-5">اعتبار کیف پول را شارژ کنید و هزینه‌ی اشتراک را بدون مراجعه‌ی دوباره به درگاه، از همین موجودی بپردازید.</p>

      {result === "success" && <div className="bg-teal/20 text-teal text-xs rounded-lg p-3 mb-4">✅ کیف پول با موفقیت شارژ شد.</div>}
      {result === "failed" && <div className="bg-danger/20 text-danger text-xs rounded-lg p-3 mb-4">شارژ کیف پول ناموفق بود.</div>}
      {result === "cancelled" && <div className="bg-amber/20 text-amber text-xs rounded-lg p-3 mb-4">پرداخت لغو شد.</div>}
      {result === "error" && <div className="bg-danger/20 text-danger text-xs rounded-lg p-3 mb-4">خطایی در پردازش پرداخت رخ داد.</div>}

      {/* Balance */}
      <div className="bg-gradient-to-br from-copper/20 to-teal/10 border border-copper/40 rounded-2xl p-5 mb-5">
        <div className="text-xs text-muted mb-1">موجودی فعلی</div>
        <div className="text-3xl font-extrabold mono">
          {balance.toLocaleString("fa-IR")} <span className="text-base font-normal text-muted">تومان</span>
        </div>
      </div>

      {/* Top-up */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5">
        <div className="text-sm font-bold mb-2">شارژ کیف پول</div>
        <label className="block text-[11px] text-muted mb-1">مبلغ دلخواه (تومان)</label>
        <input
          inputMode="numeric"
          dir="ltr"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="مثلاً 200000"
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm mono text-center mb-2"
        />
        {amountNum > 0 && (
          <div className="text-[11px] text-muted text-center mb-2">{amountNum.toLocaleString("fa-IR")} تومان</div>
        )}
        <div className="flex gap-2 mb-3 flex-wrap">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setAmount(String(q))}
              className="flex-1 min-w-[70px] text-[11px] bg-surface2 border border-surface2 rounded-lg py-1.5 hover:border-copper transition">
              {q.toLocaleString("fa-IR")}
            </button>
          ))}
        </div>
        {error && <p className="text-danger text-xs mb-2">{error}</p>}
        <button onClick={topup} disabled={loading || amountNum < 10000}
          className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
          {loading ? "در حال انتقال به درگاه..." : "پرداخت و شارژ"}
        </button>
      </div>

      {/* Ledger */}
      <div className="text-sm font-bold mb-2">تاریخچه کیف پول</div>
      {txns.length === 0 ? (
        <p className="text-xs text-muted">هنوز تراکنشی ثبت نشده.</p>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => {
            const isCredit = t.type === "TOPUP" || t.type === "REFUND";
            const settled = t.status === "PAID";
            return (
              <div key={t.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2.5 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold">{TYPE_LABEL[t.type] ?? t.type}</div>
                  {t.note && <div className="text-[10px] text-muted mt-0.5">{t.note}</div>}
                  <div className="text-[10px] text-muted mt-0.5">{formatJalaliDateTime(t.createdAt)}</div>
                </div>
                <div className="text-left shrink-0">
                  <div className={`text-sm font-bold mono ${!settled ? "text-muted" : isCredit ? "text-teal" : "text-ink"}`}>
                    {isCredit ? "+" : "−"}{t.amount.toLocaleString("fa-IR")}
                  </div>
                  <div className={`text-[10px] ${t.status === "PAID" ? "text-teal" : t.status === "FAILED" ? "text-danger" : "text-amber"}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
