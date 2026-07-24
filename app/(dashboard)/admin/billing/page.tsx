"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatJalaliDate } from "@/lib/jalali";

const STATUS_LABEL: Record<string, string> = { PENDING: "در انتظار پرداخت", PAID: "پرداخت‌شده", FAILED: "ناموفق" };

const PLAN_INFO = {
  free: { label: "رایگان", price: 0, quota: "۱۰ دستگاه در ماه" },
  pro: { label: "حرفه‌ای", price: 490000, quota: "۲۰۰ دستگاه در ماه" },
  business: { label: "تجاری", price: 990000, quota: "نامحدود" },
} as const;

const DURATIONS = [
  { key: 1, label: "۱ ماهه", discount: 0 },
  { key: 3, label: "۳ ماهه", discount: 5 },
  { key: 6, label: "۶ ماهه", discount: 10 },
  { key: 12, label: "۱۲ ماهه", discount: 20 },
] as const;

function priceFor(monthly: number, duration: number, discount: number) {
  return Math.round((monthly * duration * (100 - discount)) / 100);
}

export default function BillingPage() {
  const params = useSearchParams();
  const result = params.get("result");
  const [duration, setDuration] = useState<number>(1);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [giftMsg, setGiftMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; plan: string; months: number; amount: number; status: string; createdAt: string }[]>([]);

  const PLAN_FA: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", business: "تجاری" };

  async function loadShopAndHistory() {
    const [shopRes, histRes] = await Promise.all([fetch("/api/shop"), fetch("/api/billing/history")]);
    if (shopRes.ok) {
      const d = await shopRes.json();
      setCurrentPlan(d.shop.plan ?? "free");
      setPlanExpiresAt(d.shop.planExpiresAt ?? null);
    }
    if (histRes.ok) setHistory((await histRes.json()).subscriptions ?? []);
  }
  useEffect(() => { loadShopAndHistory(); }, []);

  const remainingDays = planExpiresAt
    ? Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = remainingDays !== null && remainingDays <= 0;

  async function redeemGift() {
    if (!giftCode.trim()) return;
    setRedeeming(true);
    setGiftMsg(null);
    const res = await fetch("/api/billing/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: giftCode.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setRedeeming(false);
    if (res.ok) {
      setGiftMsg({ ok: true, text: `✅ اشتراک ${PLAN_FA[data.plan] ?? data.plan} به مدت ${data.months} ماه رایگان فعال شد!` });
      setGiftCode("");
      setTimeout(() => window.location.reload(), 1800);
    } else {
      setGiftMsg({ ok: false, text: data.message || "ثبت کد ناموفق بود" });
    }
  }

  async function upgrade(plan: "pro" | "business") {
    setError("");
    setLoadingPlan(plan);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, duration }),
    });
    const data = await res.json();
    setLoadingPlan(null);
    if (!res.ok) { setError(data.message || "شروع پرداخت ناموفق بود"); return; }
    window.location.href = data.payUrl;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">اشتراک و پرداخت</h1>
      <p className="text-xs text-muted mb-5">پلن و مدت مناسب کسب‌وکار خود را انتخاب کنید</p>

      {result === "success" && <div className="bg-teal/20 text-teal text-xs rounded-lg p-3 mb-4">✅ پرداخت با موفقیت انجام شد و پلن شما ارتقا یافت.</div>}
      {result === "failed" && <div className="bg-danger/20 text-danger text-xs rounded-lg p-3 mb-4">پرداخت ناموفق بود.</div>}
      {result === "cancelled" && <div className="bg-amber/20 text-amber text-xs rounded-lg p-3 mb-4">پرداخت لغو شد.</div>}
      {error && <p className="text-danger text-xs mb-3">{error}</p>}

      {/* Current plan + remaining time — the whole point of "مدیریت اشتراک" */}
      <div className={`bg-gradient-to-br from-surface to-surface2 border rounded-xl p-4 mb-5 ${isExpired ? "border-danger" : "border-surface2"}`}>
        <div className="text-xs text-muted mb-1">پلن فعلی شما</div>
        <div className="text-lg font-extrabold mb-2">{PLAN_FA[currentPlan] ?? currentPlan}</div>
        {currentPlan === "free" ? (
          <p className="text-[11px] text-muted">پلن رایگان — محدود به سهمیه ماهانه، بدون تاریخ انقضا.</p>
        ) : planExpiresAt ? (
          <>
            <div className="text-[11px] text-muted">
              تاریخ انقضا: <span className="mono font-bold text-ink">{formatJalaliDate(planExpiresAt)}</span>
            </div>
            <div className={`text-sm font-bold mt-1 ${isExpired ? "text-danger" : remainingDays !== null && remainingDays <= 7 ? "text-amber" : "text-teal"}`}>
              {isExpired
                ? "⛔ اشتراک شما منقضی شده — برای ادامه دسترسی کامل، تمدید کنید"
                : `⏳ ${remainingDays?.toLocaleString("fa-IR")} روز باقی‌مانده`}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-muted">تاریخ انقضا ثبت نشده.</p>
        )}
      </div>

      {/* Gift code redemption */}
      <div className="bg-surface border border-teal/40 rounded-xl p-4 mb-5">
        <div className="text-sm font-bold mb-1">🎁 کد هدیه دارید؟</div>
        <p className="text-[11px] text-muted mb-3">کد هدیه‌ای که از پشتیبانی Peyvo گرفته‌اید را وارد کنید تا اشتراک رایگان فعال شود.</p>
        <div className="flex gap-2">
          <input
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
            placeholder="PEYVO-XXXXX"
            dir="ltr"
            className="flex-1 min-w-0 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm mono text-center"
          />
          <button onClick={redeemGift} disabled={redeeming || !giftCode.trim()}
            className="bg-teal text-white font-bold rounded-lg px-4 text-sm disabled:opacity-50 shrink-0">
            {redeeming ? "..." : "ثبت کد"}
          </button>
        </div>
        {giftMsg && <p className={`text-xs mt-2 ${giftMsg.ok ? "text-teal" : "text-danger"}`}>{giftMsg.text}</p>}
      </div>

      <div className="flex gap-2 mb-5">
        {DURATIONS.map((d) => (
          <button key={d.key} onClick={() => setDuration(d.key)}
            className={`flex-1 text-xs rounded-lg py-2 border transition ${duration === d.key ? "bg-copper text-[#1A1410] border-copper" : "bg-surface2 border-surface2 text-muted"}`}>
            {d.label}{d.discount > 0 && ` (${d.discount}%-)`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(["free", "pro", "business"] as const).map((key) => {
          const p = PLAN_INFO[key];
          const total = priceFor(p.price, duration, DURATIONS.find((d) => d.key === duration)!.discount);
          return (
            <div key={key} className={`bg-surface border rounded-xl p-4 flex justify-between items-center ${currentPlan === key ? "border-copper" : "border-surface2"}`}>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  {p.label}
                  {currentPlan === key && <span className="text-[9px] bg-copper text-[#1A1410] rounded-full px-2 py-0.5 font-bold">فعلی</span>}
                </div>
                <div className="text-[11px] text-muted mt-0.5">{p.quota}</div>
                <div className="mono text-sm mt-1">
                  {p.price === 0 ? "رایگان" : `${total.toLocaleString("fa-IR")} تومان / ${duration} ماه`}
                </div>
              </div>
              {key !== "free" && (
                <button
                  onClick={() => upgrade(key)}
                  disabled={loadingPlan === key}
                  className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-60"
                >
                  {loadingPlan === key ? "..." : "ارتقا"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Transaction history */}
      <div className="mt-6">
        <div className="text-sm font-bold mb-2">تاریخچه تراکنش‌ها</div>
        {history.length === 0 ? (
          <p className="text-xs text-muted">هنوز تراکنشی ثبت نشده.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold">{PLAN_FA[h.plan] ?? h.plan}</span>
                  <span className="text-muted"> · {h.months.toLocaleString("fa-IR")} ماهه · {formatJalaliDate(h.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono">{h.amount.toLocaleString("fa-IR")} تومان</span>
                  <span className={
                    h.status === "PAID" ? "text-teal font-semibold" : h.status === "FAILED" ? "text-danger font-semibold" : "text-amber font-semibold"
                  }>
                    {STATUS_LABEL[h.status] ?? h.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
