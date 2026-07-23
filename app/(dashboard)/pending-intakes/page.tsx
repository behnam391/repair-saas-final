"use client";
import { useEffect, useState } from "react";

type Intake = { id: string; customerName: string; customerPhone: string; deviceModel: string; imei: string | null; issueDescription: string; createdAt: string; isNewCustomer: boolean; devicePasscode?: string | null; devicePasscodeType?: string | null };

const LANES = [
  { key: "HARDWARE", label: "سخت‌افزار" },
  { key: "SOFTWARE", label: "نرم‌افزار" },
  { key: "BOARD", label: "تخصصی" },
];

export default function PendingIntakesPage() {
  const [intakes, setIntakes] = useState<Intake[]>([]);

  async function load() {
    const res = await fetch("/api/pending-intakes");
    if (res.ok) setIntakes((await res.json()).intakes ?? []);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">پذیرش‌های در انتظار تأیید (QR)</h1>
      <p className="text-[11px] text-muted mb-4">درخواست‌هایی که مشتریان با اسکن کد QR مغازه خودشان ثبت کرده‌اند.</p>

      {intakes.length === 0 && <p className="empty-state">درخواستی در انتظار نیست.</p>}

      <div className="space-y-3">
        {intakes.map((i) => (
          <IntakeCard key={i.id} intake={i} onDone={load} />
        ))}
      </div>
    </div>
  );
}

function IntakeCard({ intake, onDone }: { intake: Intake; onDone: () => void }) {
  const [lane, setLane] = useState("HARDWARE");
  const [editedName, setEditedName] = useState(intake.customerName);
  const [saving, setSaving] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setSaving(true);
    await fetch(`/api/pending-intakes/${intake.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, lane, customerName: editedName }),
    });
    onDone();
  }

  return (
    <div className="bg-surface border border-surface2 rounded-xl p-4 text-xs card-hover">
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold text-sm">{intake.deviceModel}</div>
        <div className="text-muted mono shrink-0">{intake.customerPhone}</div>
      </div>
      {intake.imei && <div className="mono text-muted mt-0.5">IMEI: {intake.imei}</div>}

      {intake.devicePasscode && (
        <div className="text-xs mt-1.5 bg-surface2 rounded-lg px-2 py-1">
          <span className="text-muted">رمز گوشی ({intake.devicePasscodeType === "PATTERN" ? "الگو" : intake.devicePasscodeType === "PASSWORD" ? "پسورد" : "پین"}): </span>
          <span className="mono font-bold">{intake.devicePasscode}</span>
        </div>
      )}
      <div className="text-ink mt-2">{intake.issueDescription}</div>

      {/* New-customer suggestion — offer to save (with an editable name). */}
      {intake.isNewCustomer ? (
        <div className="mt-3 bg-copper/10 border border-copper/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-copper font-bold mb-2">
            ✨ مشتری جدید — در دفترچه مغازه شما نیست
          </div>
          <label className="block text-[11px] text-muted mb-1">نام برای ذخیره در دفترچه (قابل ویرایش)</label>
          <input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-1"
          />
          <p className="text-[10px] text-muted">با تأیید پذیرش، این مشتری به‌طور خودکار در دفترچه مشتریان ذخیره می‌شود.</p>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-teal">✓ مشتری قدیمی — {intake.customerName}</div>
      )}

      {/* Lane picker as buttons (no tiny dropdown). */}
      <div className="mt-3">
        <div className="text-[11px] text-muted mb-1.5">ارجاع به بخش:</div>
        <div className="flex gap-1.5">
          {LANES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLane(l.key)}
              className={`flex-1 text-[11px] font-bold rounded-lg py-2 border transition ${
                lane === l.key ? "bg-copper text-white border-copper" : "bg-surface2 border-border text-muted"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button disabled={saving} onClick={() => decide("approve")}
          className="flex-[2] bg-teal text-white text-xs font-bold rounded-lg py-2.5 disabled:opacity-50">
          ✓ تأیید و پذیرش
        </button>
        <button disabled={saving} onClick={() => decide("reject")}
          className="flex-1 bg-surface2 border border-border text-danger text-xs font-semibold rounded-lg py-2.5 disabled:opacity-50">
          رد
        </button>
      </div>
    </div>
  );
}
