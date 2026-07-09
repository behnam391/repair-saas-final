"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLAN_INFO = {
  free: { label: "رایگان", price: 0, quota: "۱۰ دستگاه در ماه" },
  pro: { label: "حرفه‌ای", price: 490000, quota: "۲۰۰ دستگاه در ماه" },
  business: { label: "تجاری", price: 990000, quota: "نامحدود" },
} as const;

export default function BillingPage() {
  const params = useSearchParams();
  const result = params.get("result");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function upgrade(plan: "pro" | "business") {
    setError("");
    setLoadingPlan(plan);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setLoadingPlan(null);
    if (!res.ok) { setError(data.message || "شروع پرداخت ناموفق بود"); return; }
    window.location.href = data.payUrl;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="font-extrabold mb-1">اشتراک و پرداخت</h1>
      <p className="text-xs text-muted mb-5">پلن مناسب کسب‌وکار خود را انتخاب کنید</p>

      {result === "success" && <div className="bg-teal/20 text-teal text-xs rounded-lg p-3 mb-4">✅ پرداخت با موفقیت انجام شد و پلن شما ارتقا یافت.</div>}
      {result === "failed" && <div className="bg-danger/20 text-danger text-xs rounded-lg p-3 mb-4">پرداخت ناموفق بود.</div>}
      {result === "cancelled" && <div className="bg-amber/20 text-amber text-xs rounded-lg p-3 mb-4">پرداخت لغو شد.</div>}
      {error && <p className="text-danger text-xs mb-3">{error}</p>}

      <div className="space-y-3">
        {(["free", "pro", "business"] as const).map((key) => {
          const p = PLAN_INFO[key];
          return (
            <div key={key} className="bg-surface border border-surface2 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="font-bold text-sm">{p.label}</div>
                <div className="text-[11px] text-muted mt-0.5">{p.quota}</div>
                <div className="mono text-sm mt-1">{p.price === 0 ? "رایگان" : `${p.price.toLocaleString("fa-IR")} تومان / ماه`}</div>
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
    </div>
  );
}
