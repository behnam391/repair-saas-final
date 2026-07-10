"use client";
import { useEffect, useState } from "react";

const LANES = [
  { key: "HARDWARE", label: "سخت‌افزار" },
  { key: "SOFTWARE", label: "نرم‌افزار" },
  { key: "BOARD", label: "تخصصی (برد/هارد)" },
  { key: "READY", label: "آماده تحویل" },
] as const;

type Ticket = {
  id: string;
  no: number;
  deviceModel: string;
  issueInitial: string;
  lane: string;
  status: string;
  customer: { name: string; phone: string };
  history: { action: string; lane: string; note?: string; createdAt: string; tech?: { name: string } }[];
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tickets");
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function transition(id: string, action: string, targetLane?: string) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, targetLane }),
    });
    if (!res.ok) {
      const err = await res.json();
      flash(err.message || "خطایی رخ داد");
      return;
    }
    await load();
    setOpenTicket(null);
    if (action === "ready") flash("📩 پیامک آماده‌تحویل برای مشتری ارسال شد");
  }

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="display-heading text-lg">تیکت‌های تعمیر</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-copper text-[#1A1410] font-bold text-xs rounded-lg px-4 py-2"
        >
          + پذیرش دستگاه
        </button>
      </div>

      {loading ? (
        <p className="text-muted text-sm text-center py-10">در حال بارگذاری...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {LANES.map((lane) => {
            const items = tickets.filter((t) => t.lane === lane.key);
            return (
              <div key={lane.key} className="flex-none w-[84vw] sm:w-72 bg-surface border border-surface2 rounded-2xl">
                <div className="flex justify-between items-center px-3 py-2.5 border-b border-surface2">
                  <span className="font-bold text-[13px]">{lane.label}</span>
                  <span className="mono text-xs text-muted">{items.length}</span>
                </div>
                <div className="p-2.5 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
                  {items.length === 0 && (
                    <div className="text-muted text-xs text-center py-6 border border-dashed border-surface2 rounded-lg">
                      دستگاهی در این مرحله نیست
                    </div>
                  )}
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOpenTicket(t)}
                      className={`repair-tag ${t.status === "READY" ? "tag-ready" : t.status === "IN_PROGRESS" ? "tag-progress" : ""} text-right bg-surface2 rounded-xl p-3 pr-4 hover:brightness-110 transition`}
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-bold">{t.deviceModel}</span>
                        <span className="mono text-muted">#{t.no}</span>
                      </div>
                      <div className="text-[11px] text-muted mt-1">{t.customer.name}</div>
                      <div className="text-xs mt-1.5 text-[#C7CAD1]">{t.issueInitial}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openTicket && (
        <TicketDetail
          ticket={openTicket}
          onClose={() => setOpenTicket(null)}
          onTransition={transition}
        />
      )}
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={load} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#1B302D] border border-teal text-teal text-xs px-4 py-2.5 rounded-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function TicketDetail({
  ticket,
  onClose,
  onTransition,
}: {
  ticket: Ticket;
  onClose: () => void;
  onTransition: (id: string, action: string, targetLane?: string) => void;
}) {
  const [referOpen, setReferOpen] = useState(false);
  const [targetLane, setTargetLane] = useState("SOFTWARE");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-extrabold text-base">
          {ticket.deviceModel} <span className="mono text-muted text-xs">#{ticket.no}</span>
        </div>
        <div className="text-xs text-muted mb-4">{ticket.customer.name} · {ticket.customer.phone}</div>

        <div className="space-y-2.5 mb-5">
          {ticket.history.map((h, i) => (
            <div key={i} className="bg-surface2 border border-surface2 rounded-lg p-2.5">
              <div className="text-[13px] font-bold">{h.action}</div>
              <div className="text-[11px] mono text-muted mt-0.5">
                {h.tech?.name} · {new Date(h.createdAt).toLocaleString("fa-IR")}
              </div>
              {h.note && <div className="text-xs text-[#C7CAD1] mt-1.5">{h.note}</div>}
            </div>
          ))}
        </div>

        {ticket.lane !== "READY" ? (
          <>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onTransition(ticket.id, "start")} className="flex-1 bg-copper text-[#1A1410] text-xs font-bold rounded-lg py-2.5">
                شروع/ادامه کار
              </button>
              <button onClick={() => setReferOpen((v) => !v)} className="flex-1 bg-surface2 border border-surface2 text-xs font-semibold rounded-lg py-2.5">
                ارجاع به بخش دیگر
              </button>
              <button onClick={() => onTransition(ticket.id, "ready")} className="flex-1 bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2.5">
                تکمیل و آماده تحویل
              </button>
            </div>
            {referOpen && (
              <div className="flex gap-2 mt-2.5">
                <select
                  value={targetLane}
                  onChange={(e) => setTargetLane(e.target.value)}
                  className="flex-1 bg-surface2 border border-surface2 rounded-lg px-2 text-xs"
                >
                  {LANES.filter((l) => l.key !== ticket.lane && l.key !== "READY").map((l) => (
                    <option key={l.key} value={l.key}>{l.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => onTransition(ticket.id, "refer", targetLane)}
                  className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4"
                >
                  ارجاع
                </button>
              </div>
            )}
          </>
        ) : (
          <button onClick={() => onTransition(ticket.id, "deliver")} className="w-full bg-copper text-[#1A1410] text-xs font-bold rounded-lg py-2.5">
            ثبت تحویل به مشتری
          </button>
        )}
      </div>
    </div>
  );
}

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", deviceModel: "", imei: "", issueInitial: "", lane: "HARDWARE",
  });
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "ثبت تیکت ناموفق بود");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-extrabold text-base mb-1">پذیرش دستگاه جدید</div>
        <div className="text-xs text-muted mb-4">اطلاعات مشتری و دستگاه را وارد کنید</div>

        {[
          ["نام مشتری", "customerName", "text"],
          ["شماره تماس", "customerPhone", "tel"],
          ["مدل دستگاه", "deviceModel", "text"],
          ["IMEI (اختیاری)", "imei", "text"],
        ].map(([label, key, type]) => (
          <div className="mb-3" key={key}>
            <label className="block text-xs text-muted mb-1">{label}</label>
            <input
              type={type}
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}

        <div className="mb-3">
          <label className="block text-xs text-muted mb-1">شرح عیب</label>
          <textarea
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.issueInitial}
            onChange={(e) => setForm({ ...form, issueInitial: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">ارجاع اولیه به</label>
          <select
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.lane}
            onChange={(e) => setForm({ ...form, lane: e.target.value })}
          >
            {LANES.filter((l) => l.key !== "READY").map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
          ثبت پذیرش
        </button>
      </div>
    </div>
  );
}
