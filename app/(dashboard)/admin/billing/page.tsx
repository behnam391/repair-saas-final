"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatJalaliDate } from "@/lib/jalali";
import {
  hasMyketBillingPlugin,
  getNativeStore,
  MyketBilling,
  type MyketPurchase,
} from "@/lib/myket-billing-client";

const STATUS_LABEL: Record<string, string> = { PENDING: "در انتظار پرداخت", PAID: "پرداخت‌شده", FAILED: "ناموفق" };

type PlanRow = { label: string; priceToman: number; monthlyQuota: number };
type DurRow = { months: number; label: string; discountPct: number };
type Pricing = {
  plans: Record<"free" | "pro" | "business", PlanRow>;
  durations: Record<string, DurRow>;
};

type StoreMode = "checking" | "web" | "myket" | "bazaar" | "native";
type MyketConfig = {
  enabled: boolean;
  publicKey: string;
  packageName: string;
  skus: string[];
  missing: string[];
};

function myketSku(plan: "pro" | "business", months: number) {
  return `peyvo.${plan}.${months}m`;
}

function readableError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }
  return fallback;
}

// Fallback shown only until /api/pricing responds — the server (getPricing) is
// the source of truth, reflecting any prices the super admin set in the panel.
const DEFAULT_PRICING: Pricing = {
  plans: {
    free: { label: "رایگان", priceToman: 0, monthlyQuota: 10 },
    pro: { label: "حرفه‌ای", priceToman: 490000, monthlyQuota: 200 },
    business: { label: "تجاری", priceToman: 990000, monthlyQuota: 100000 },
  },
  durations: {
    "1": { months: 1, label: "۱ ماهه", discountPct: 0 },
    "3": { months: 3, label: "۳ ماهه", discountPct: 5 },
    "6": { months: 6, label: "۶ ماهه", discountPct: 10 },
    "12": { months: 12, label: "۱۲ ماهه", discountPct: 20 },
  },
};

const DURATION_KEYS = [1, 3, 6, 12] as const;

function priceFor(monthly: number, months: number, discount: number) {
  return Math.round((monthly * months * (100 - discount)) / 100);
}

function quotaLabel(quota: number) {
  return quota >= 100000 ? "نامحدود" : `${quota.toLocaleString("fa-IR")} دستگاه در ماه`;
}

export default function BillingPage() {
  const params = useSearchParams();
  const result = params.get("result");
  const [duration, setDuration] = useState<number>(1);
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [giftMsg, setGiftMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [storeMode, setStoreMode] = useState<StoreMode>("checking");
  const [myketConfig, setMyketConfig] = useState<MyketConfig | null>(null);
  const [myketAvailable, setMyketAvailable] = useState(true);
  const [myketRestoring, setMyketRestoring] = useState(false);
  const [myketNotice, setMyketNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});

  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; plan: string; months: number; amount: number; status: string; paymentProvider?: string | null; createdAt: string }[]>([]);

  const PLAN_FA: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", business: "تجاری" };

  async function loadShopAndHistory(includeWallet = storeMode === "web") {
    const [shopRes, histRes, walletRes] = await Promise.all([
      fetch("/api/shop"),
      fetch("/api/billing/history"),
      includeWallet ? fetch("/api/wallet") : Promise.resolve(null),
    ]);
    if (shopRes.ok) {
      const d = await shopRes.json();
      setCurrentPlan(d.shop.plan ?? "free");
      setPlanExpiresAt(d.shop.planExpiresAt ?? null);
    }
    if (histRes.ok) setHistory((await histRes.json()).subscriptions ?? []);
    if (walletRes?.ok) setWalletBalance((await walletRes.json()).balance ?? 0);
  }

  useEffect(() => {
    getNativeStore().then((mode) => {
      setStoreMode(mode);
      loadShopAndHistory(mode === "web");
      if (mode === "myket" || mode === "bazaar") initializeStore(mode);
    });
  }, []);

  // Live subscription prices (may have been changed by the super admin).
  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.plans && d?.durations) setPricing(d); })
      .catch(() => {});
  }, []);

  const durationList = DURATION_KEYS.map((k) => ({ key: k, ...(pricing.durations[String(k)] ?? DEFAULT_PRICING.durations[String(k)]) }));
  const activeDiscount = pricing.durations[String(duration)]?.discountPct ?? 0;

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

  async function verifyAndConsumeStore(purchase: MyketPurchase, intentId?: string, publicKey?: string, provider: "myket" | "bazaar" = storeMode === "bazaar" ? "bazaar" : "myket") {
    const verifyRes = await fetch(`/api/billing/${provider}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intentId,
        purchase: {
          sku: purchase.sku,
          token: purchase.token,
          orderId: purchase.orderId || null,
          developerPayload: purchase.developerPayload,
          purchaseTime: purchase.purchaseTime,
          ...(provider === "bazaar" ? { originalJson: purchase.originalJson, signature: purchase.signature } : {}),
        },
      }),
    });
    const verified = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok) throw new Error(verified.message || "تأیید خرید فروشگاه ناموفق بود.");

    try {
      await MyketBilling.consume({
        publicKey: publicKey || myketConfig?.publicKey || "",
        originalJson: purchase.originalJson,
        signature: purchase.signature || "",
        itemType: purchase.itemType || "inapp",
      });
    } catch {
      // Entitlement is already safely active. The next automatic restore will
      // retry consumption, so never tell the customer their paid plan failed.
      setMyketNotice({ ok: true, text: "اشتراک فعال شد؛ نهایی‌سازی رسید در ورود بعدی دوباره انجام می‌شود." });
    }
    return verified;
  }

  async function restoreStorePurchases(config: MyketConfig, provider: "myket" | "bazaar" = storeMode === "bazaar" ? "bazaar" : "myket") {
    setMyketRestoring(true);
    try {
      const inventory = await MyketBilling.restore({ publicKey: config.publicKey, skus: config.skus });
      const prices: Record<string, string> = {};
      for (const product of inventory.products ?? []) {
        if (product.sku && product.price) prices[product.sku] = product.price;
      }
      setStorePrices(prices);

      let restored = 0;
      for (const purchase of inventory.purchases ?? []) {
        try {
          await verifyAndConsumeStore(purchase, undefined, config.publicKey, provider);
          restored++;
        } catch {
          // Keep the receipt owned/unconsumed so a later restore can retry.
        }
      }
      if (restored > 0) {
        setMyketNotice({ ok: true, text: `خرید قبلی ${provider === "bazaar" ? "بازار" : "مایکت"} با موفقیت بازیابی و اشتراک فعال شد.` });
        await loadShopAndHistory(false);
      }
    } catch (restoreError) {
      setError(readableError(restoreError, "دریافت محصولات فروشگاه ناموفق بود."));
    } finally {
      setMyketRestoring(false);
    }
  }

  async function initializeStore(mode: "myket" | "bazaar") {
    setError("");
    if (!hasMyketBillingPlugin()) {
      setMyketAvailable(false);
      setError("افزونه پرداخت فروشگاه در این نصب در دسترس نیست. برنامه را از همان فروشگاه دوباره نصب کنید.");
      return;
    }
    try {
      const availability = await MyketBilling.isAvailable();
      setMyketAvailable(availability.available);
      if (!availability.available) {
        setError(`برای خرید اشتراک، برنامه ${mode === "bazaar" ? "بازار" : "مایکت"} باید روی گوشی نصب باشد.`);
        return;
      }
      const res = await fetch(`/api/billing/${mode}/config`, { cache: "no-store" });
      const config = (await res.json().catch(() => null)) as MyketConfig | null;
      if (!res.ok || !config) throw new Error("دریافت تنظیمات فروشگاه ناموفق بود.");
      setMyketConfig(config);
      if (!config.enabled) {
        setError(`پرداخت ${mode === "bazaar" ? "بازار" : "مایکت"} هنوز توسط مدیر سامانه تکمیل نشده است.`);
        return;
      }
      await restoreStorePurchases(config, mode);
    } catch (initError) {
      setError(readableError(initError, "راه‌اندازی پرداخت فروشگاه ناموفق بود."));
    }
  }

  async function startStorePurchase(plan: "pro" | "business", dur: number) {
    const config = myketConfig;
    if (!config?.enabled || !myketAvailable || myketRestoring) return;
    const sku = myketSku(plan, dur);
    setError("");
    setMyketNotice(null);
    setLoadingPlan(`${sku}-myket`);
    let intentId = "";
    let receiptReceived = false;
    try {
      const intentRes = await fetch(`/api/billing/${storeMode}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const intent = await intentRes.json().catch(() => ({}));
      if (!intentRes.ok) throw new Error(intent.message || "ساخت درخواست خرید ناموفق بود.");
      intentId = intent.intentId;

      const purchase = await MyketBilling.purchase({ publicKey: config.publicKey, sku, payload: intent.payload });
      receiptReceived = true;
      await verifyAndConsumeStore(purchase, intentId, config.publicKey);
      setMyketNotice({ ok: true, text: `پرداخت ${storeMode === "bazaar" ? "بازار" : "مایکت"} تأیید شد و اشتراک شما فعال شد.` });
      await loadShopAndHistory(false);
    } catch (purchaseError) {
      if (intentId && !receiptReceived) {
        await fetch("/api/billing/history", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: intentId }),
        }).catch(() => {});
      }
      setError(readableError(purchaseError, receiptReceived
        ? "رسید خرید ثبت شد اما تأیید آن کامل نشد؛ گزینه بازیابی خرید را بزنید."
        : "خرید فروشگاهی انجام نشد."));
    } finally {
      setLoadingPlan(null);
    }
  }

  // Unified checkout: gateway (redirect) or wallet (instant). `dur` lets the
  // history «ادامه پرداخت» button resume a specific attempt's plan+duration.
  async function startCheckout(plan: string, dur: number, payWith: "gateway" | "wallet") {
    setError("");
    setLoadingPlan(`${plan}-${payWith}`);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, duration: dur, payWith }),
    });
    const data = await res.json().catch(() => ({}));
    setLoadingPlan(null);
    if (!res.ok) { setError(data.message || "شروع پرداخت ناموفق بود"); return; }
    if (data.paidFromWallet) { window.location.reload(); return; }
    window.location.href = data.payUrl;
  }

  async function cancelPending(id: string) {
    await fetch("/api/billing/history", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    loadShopAndHistory();
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/billing/history?id=${id}`, { method: "DELETE" });
    loadShopAndHistory();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">اشتراک و پرداخت</h1>
      <p className="text-xs text-muted mb-5">پلن و مدت مناسب کسب‌وکار خود را انتخاب کنید</p>

      {result === "success" && <div className="bg-teal/20 text-teal text-xs rounded-lg p-3 mb-4">✅ پرداخت با موفقیت انجام شد و پلن شما ارتقا یافت.</div>}
      {result === "failed" && <div className="bg-danger/20 text-danger text-xs rounded-lg p-3 mb-4">پرداخت ناموفق بود.</div>}
      {result === "cancelled" && <div className="bg-amber/20 text-amber text-xs rounded-lg p-3 mb-4">پرداخت لغو شد.</div>}
      {error && <p className="text-danger text-xs mb-3">{error}</p>}
      {storeMode === "native" && (
        <div className="bg-amber/10 text-amber border border-amber/30 text-xs rounded-xl p-3 mb-4 leading-6">
          فروشگاه نصب‌کننده برنامه شناسایی نشد؛ خرید اشتراک تا نصب نسخه رسمی همان فروشگاه غیرفعال است. هیچ روش پرداخت جایگزینی در این نسخه نمایش داده نمی‌شود.
        </div>
      )}
      {myketNotice && (
        <div className={`${myketNotice.ok ? "bg-teal/20 text-teal" : "bg-danger/20 text-danger"} text-xs rounded-lg p-3 mb-4`}>
          {myketNotice.text}
        </div>
      )}

      {(storeMode === "myket" || storeMode === "bazaar") && (
        <div className="bg-gradient-to-l from-teal/15 to-surface border border-teal/35 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-teal">پرداخت امن درون‌برنامه‌ای {storeMode === "bazaar" ? "بازار" : "مایکت"}</div>
            <p className="text-[10px] text-muted mt-1">خرید و بازیابی اشتراک بدون خروج از برنامه انجام می‌شود.</p>
          </div>
          <button
            type="button"
            onClick={() => myketConfig?.enabled && restoreStorePurchases(myketConfig)}
            disabled={!myketConfig?.enabled || !myketAvailable || myketRestoring || !!loadingPlan}
            className="shrink-0 text-[10px] font-bold rounded-lg px-3 py-2 bg-teal/20 text-teal disabled:opacity-40"
          >
            {myketRestoring ? "در حال بررسی..." : "بازیابی خرید"}
          </button>
        </div>
      )}

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

      {/* Wallet is a web-only payment route; Myket policy requires its own IAP. */}
      {storeMode === "web" && (
        <div className="flex items-center justify-between bg-surface2 border border-surface2 rounded-xl px-4 py-3 mb-5">
          <div className="text-xs">
            <span className="text-muted">👛 موجودی کیف پول: </span>
            <span className="mono font-bold">{walletBalance.toLocaleString("fa-IR")} تومان</span>
          </div>
          <a href="/admin/wallet" className="text-[11px] text-copper font-semibold whitespace-nowrap">شارژ کیف پول →</a>
        </div>
      )}

      {/* Gift codes stay web-only; store builds must have no parallel digital-entitlement path. */}
      {storeMode === "web" && <div className="bg-surface border border-teal/40 rounded-xl p-4 mb-5">
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
      </div>}

      <div className="flex gap-2 mb-5">
        {durationList.map((d) => (
          <button key={d.key} onClick={() => setDuration(d.key)}
            className={`flex-1 text-xs rounded-lg py-2 border transition ${duration === d.key ? "bg-copper text-[#1A1410] border-copper" : "bg-surface2 border-surface2 text-muted"}`}>
            {d.label}{d.discountPct > 0 && ` (${d.discountPct}%-)`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(["free", "pro", "business"] as const).map((key) => {
          const p = pricing.plans[key];
          const total = priceFor(p.priceToman, duration, activeDiscount);
          const sku = key === "free" ? "" : myketSku(key, duration);
          const myketPrice = sku ? storePrices[sku] : "";
          return (
            <div key={key} className={`bg-surface border rounded-xl p-4 flex justify-between items-center ${currentPlan === key ? "border-copper" : "border-surface2"}`}>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  {p.label}
                  {currentPlan === key && <span className="text-[9px] bg-copper text-[#1A1410] rounded-full px-2 py-0.5 font-bold">فعلی</span>}
                </div>
                <div className="text-[11px] text-muted mt-0.5">{quotaLabel(p.monthlyQuota)}</div>
                <div className="mono text-sm mt-1">
                  {p.priceToman === 0
                    ? "رایگان"
                    : storeMode !== "web" && storeMode !== "checking" && myketPrice
                      ? `${myketPrice} / ${duration} ماه`
                      : `${total.toLocaleString("fa-IR")} تومان / ${duration} ماه`}
                </div>
              </div>
              {key !== "free" && storeMode === "web" && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => startCheckout(key, duration, "gateway")}
                    disabled={loadingPlan === `${key}-gateway`}
                    className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-60"
                  >
                    {loadingPlan === `${key}-gateway` ? "..." : "ارتقا (درگاه)"}
                  </button>
                  <button
                    onClick={() => startCheckout(key, duration, "wallet")}
                    disabled={loadingPlan === `${key}-wallet` || walletBalance < total}
                    title={walletBalance < total ? "موجودی کیف پول کافی نیست" : "پرداخت از موجودی کیف پول"}
                    className="bg-teal/20 text-teal text-[11px] font-bold rounded-lg px-4 py-1.5 disabled:opacity-40"
                  >
                    {loadingPlan === `${key}-wallet` ? "..." : "از کیف پول"}
                  </button>
                </div>
              )}
              {key !== "free" && (storeMode === "myket" || storeMode === "bazaar") && (
                <button
                  onClick={() => startStorePurchase(key, duration)}
                  disabled={!myketConfig?.enabled || !myketAvailable || myketRestoring || !!loadingPlan}
                  className="bg-teal text-white text-xs font-bold rounded-lg px-4 py-2.5 disabled:opacity-40 shrink-0"
                >
                  {loadingPlan === `${sku}-myket` ? "در حال اتصال..." : `خرید از ${storeMode === "bazaar" ? "بازار" : "مایکت"}`}
                </button>
              )}
              {key !== "free" && storeMode === "checking" && (
                <button disabled className="bg-surface2 text-muted text-xs font-bold rounded-lg px-4 py-2.5 opacity-50 shrink-0">
                  در حال بررسی...
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
              <div key={h.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs">
                <div className="flex justify-between items-center">
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
                {h.status !== "PAID" && (
                  <div className="flex gap-1.5 mt-2 justify-end">
                    {h.status === "PENDING" && storeMode === "web" && (
                      <>
                        <button onClick={() => startCheckout(h.plan, h.months, "gateway")}
                          className="text-[10px] font-semibold rounded-md px-2.5 py-1 bg-copper/20 text-copper">ادامه پرداخت</button>
                        <button onClick={() => cancelPending(h.id)}
                          className="text-[10px] font-semibold rounded-md px-2.5 py-1 bg-amber/20 text-amber">لغو</button>
                      </>
                    )}
                    <button onClick={() => deleteEntry(h.id)}
                      className="text-[10px] font-semibold rounded-md px-2.5 py-1 bg-danger/15 text-danger">حذف</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
