"use client";
import { useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";
import JalaliDatePicker from "@/components/JalaliDatePicker";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در صف", IN_PROGRESS: "در حال انجام", AWAITING_APPROVAL: "منتظر تأیید",
  READY: "آماده تحویل", DELIVERED: "تحویل‌شده", CANCELLED: "لغوشده",
};

type Result = {
  id: string; no: number; deviceModel: string; imei: string | null; issueInitial: string; status: string; createdAt: string;
  customer: { name: string; phone: string }; assignedTo: { name: string } | null;
};

export default function HistoryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/tickets/search?${params.toString()}`);
    if (res.ok) setResults((await res.json()).tickets ?? []);
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">سابقه و جستجو</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6 space-y-2">
        <input
          className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجو: نام/شماره مشتری، مدل دستگاه، یا IMEI"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <div className="flex gap-2">
          <select className="flex-1 bg-surface2 rounded-lg px-2 py-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-muted mb-1">از تاریخ</label>
            <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-2 py-2 text-xs" value={from} onChange={setFrom} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-muted mb-1">تا تاریخ</label>
            <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-2 py-2 text-xs" value={to} onChange={setTo} />
          </div>
        </div>
        <button onClick={search} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">جستجو</button>
      </div>

      {searched && (
        loading ? (
          <p className="text-muted text-sm text-center py-8">در حال جستجو...</p>
        ) : results.length === 0 ? (
          <p className="text-xs text-muted text-center py-8">موردی پیدا نشد.</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">{r.deviceModel} #{r.no}</span>
                  <span className="text-muted">{STATUS_LABEL[r.status] ?? r.status}</span>
                </div>
                <div className="text-muted mt-1">{r.customer.name} · {r.customer.phone}</div>
                {r.imei && <div className="mono text-muted mt-0.5">IMEI: {r.imei}</div>}
                <div className="text-[#C7CAD1] mt-1">{r.issueInitial}</div>
                <div className="text-[10px] text-muted mt-1">
                  {r.assignedTo?.name && `تعمیرکار: ${r.assignedTo.name} · `}{formatJalaliDate(r.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
