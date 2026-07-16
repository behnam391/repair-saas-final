"use client";
import { useEffect, useState } from "react";

type Intake = { id: string; customerName: string; customerPhone: string; deviceModel: string; imei: string | null; issueDescription: string; createdAt: string; isNewCustomer: boolean };

export default function PendingIntakesPage() {
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [laneChoice, setLaneChoice] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/pending-intakes");
    if (res.ok) setIntakes((await res.json()).intakes ?? []);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: "approve" | "reject") {
    await fetch(`/api/pending-intakes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, lane: laneChoice[id] || "HARDWARE" }),
    });
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">پذیرش‌های در انتظار تأیید (QR)</h1>
      <p className="text-[11px] text-muted mb-4">درخواست‌هایی که مشتریان با اسکن کد QR مغازه خودشان ثبت کرده‌اند.</p>

      {intakes.length === 0 && <p className="text-xs text-muted text-center py-8">درخواستی در انتظار نیست.</p>}

      <div className="space-y-3">
        {intakes.map((i) => (
          <div key={i.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-start">
              <div className="font-bold">{i.deviceModel}</div>
              {i.isNewCustomer && <span className="text-[9px] bg-copper/20 text-copper rounded-full px-2 py-0.5 shrink-0">مشتری جدید — با تأیید، ذخیره می‌شود</span>}
            </div>
            <div className="text-muted mt-0.5">{i.customerName} · {i.customerPhone}</div>
            {i.imei && <div className="mono text-muted mt-0.5">IMEI: {i.imei}</div>}
            <div className="text-[#C7CAD1] mt-1.5">{i.issueDescription}</div>
            <div className="flex gap-2 mt-2.5">
              <select className="bg-surface rounded-lg px-2 py-1.5 text-xs"
                value={laneChoice[i.id] || "HARDWARE"} onChange={(e) => setLaneChoice({ ...laneChoice, [i.id]: e.target.value })}>
                <option value="HARDWARE">سخت‌افزار</option>
                <option value="SOFTWARE">نرم‌افزار</option>
                <option value="BOARD">تخصصی</option>
              </select>
              <button onClick={() => decide(i.id, "approve")} className="bg-teal text-[#0E211E] text-xs font-bold rounded-lg px-3 py-1.5">تأیید و پذیرش</button>
              <button onClick={() => decide(i.id, "reject")} className="bg-surface text-danger text-xs font-semibold rounded-lg px-3 py-1.5">رد</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
