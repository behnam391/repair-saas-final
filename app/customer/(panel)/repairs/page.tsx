"use client";
import { useEffect, useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";
import TicketChat from "@/components/TicketChat";

type Repair = {
  id: string; no: number; deviceModel: string; status: string; lane: string;
  estimatedCost: number | null; finalCost: number | null;
  createdAt: string; deliveredAt: string | null; rated: boolean;
  shop: { id: string; name: string; phone: string | null; province: string | null; address: string | null };
  invoice: { total: number; paid: boolean } | null;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "در صف بررسی", cls: "bg-copper/15 text-copper" },
  IN_PROGRESS: { label: "در حال تعمیر", cls: "bg-amber/15 text-amber" },
  AWAITING_APPROVAL: { label: "منتظر تأیید هزینه", cls: "bg-danger/15 text-danger" },
  REFERRED: { label: "ارجاع به بخش دیگر", cls: "bg-surface2 text-muted" },
  READY: { label: "آماده تحویل ✅", cls: "bg-teal/15 text-teal" },
  DELIVERED: { label: "تحویل شده", cls: "bg-surface2 text-muted" },
  CANCELLED: { label: "لغو شده", cls: "bg-surface2 text-muted" },
};

export default function CustomerRepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatWith, setChatWith] = useState<Repair | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/customer/my-repairs");
      if (res.ok) setRepairs((await res.json()).tickets ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="display-heading text-lg mb-1">تعمیرهای من</h1>
      <p className="text-xs text-muted mb-4">
        سابقه تعمیر دستگاه‌های شما در همه تعمیرگاه‌های عضو — بر اساس شماره موبایلی که هنگام پذیرش داده‌اید.
      </p>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">در حال بارگذاری...</p>
      ) : repairs.length === 0 ? (
        <div className="text-xs text-muted text-center py-8 leading-6">
          هنوز تعمیری با شماره موبایل شما ثبت نشده.
          <br />وقتی دستگاهی را به یکی از تعمیرگاه‌های عضو بسپارید، وضعیتش همین‌جا نمایش داده می‌شود.
        </div>
      ) : (
        <div className="space-y-2">
          {repairs.map((r) => {
            const st = STATUS_LABELS[r.status] ?? { label: r.status, cls: "bg-surface2 text-muted" };
            const tagCls = r.status === "READY" ? "tag-ready" : r.status === "IN_PROGRESS" ? "tag-progress" : "";
            return (
              <div key={r.id} className={`repair-tag card-hover ${tagCls} bg-surface border border-surface2 rounded-xl p-3 text-xs`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm">{r.deviceModel}</div>
                    <div className="text-muted mt-0.5">
                      {r.shop.name}{r.shop.province ? ` · ${r.shop.province}` : ""} · کد پیگیری #{r.no}
                    </div>
                  </div>
                  <span className={`text-[10px] rounded-lg px-2 py-1 whitespace-nowrap ${st.cls}`}>{st.label}</span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-muted">
                  <span>پذیرش: {formatJalaliDate(r.createdAt)}</span>
                  {r.deliveredAt && <span>تحویل: {formatJalaliDate(r.deliveredAt)}</span>}
                  {r.invoice ? (
                    <span>
                      فاکتور: {r.invoice.total.toLocaleString("fa-IR")} تومان
                      {r.invoice.paid ? " (پرداخت‌شده)" : " (پرداخت‌نشده)"}
                    </span>
                  ) : r.finalCost ? (
                    <span>هزینه نهایی: {r.finalCost.toLocaleString("fa-IR")} تومان</span>
                  ) : r.estimatedCost ? (
                    <span>برآورد هزینه: {r.estimatedCost.toLocaleString("fa-IR")} تومان</span>
                  ) : null}
                </div>

                <div className="flex gap-3 mt-2 pt-2 border-t border-surface2 flex-wrap items-center">
                  <button onClick={() => setChatWith(r)} className="text-copper font-bold">💬 گفتگو با مغازه</button>
                  <a href={`/shop/${r.shop.id}`} className="text-teal">صفحه مغازه ↗</a>
                  {r.shop.phone && <a href={`tel:${r.shop.phone}`} className="text-muted">📞 تماس</a>}
                  {r.status === "DELIVERED" && !r.rated && (
                    <a href={`/rate/${r.id}`} className="text-amber mr-auto">⭐ امتیاز به این تعمیر</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {chatWith && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4" onClick={() => setChatWith(null)}>
          <div className="bg-surface border border-surface2 rounded-t-2xl sm:rounded-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-sm">گفتگو با {chatWith.shop.name}</div>
                <div className="text-[11px] text-muted">{chatWith.deviceModel} · کد #{chatWith.no}</div>
              </div>
              <button onClick={() => setChatWith(null)} className="bg-surface2 rounded-full w-8 h-8 text-sm">✕</button>
            </div>
            <TicketChat endpoint={`/api/customer/repairs/${chatWith.id}/messages`} iAmCustomer />
          </div>
        </div>
      )}
    </div>
  );
}
