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

  async function transition(id: string, action: string, targetLane?: string, extra?: Record<string, any>) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, targetLane, ...extra }),
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

function ReferralFlow({ history, currentLane }: { history: { lane: string }[]; currentLane: string }) {
  const order = ["HARDWARE", "SOFTWARE", "BOARD", "READY"];
  const visited = Array.from(new Set(history.map((h) => h.lane)));
  const labelMap: Record<string, string> = { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی", READY: "آماده" };

  return (
    <div className="flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar">
      {order.map((lane, i) => {
        const isVisited = visited.includes(lane);
        const isCurrent = lane === currentLane;
        return (
          <div key={lane} className="flex items-center gap-1 shrink-0">
            <div
              className={`text-[10px] font-bold rounded-full px-2.5 py-1 border transition ${
                isCurrent
                  ? "bg-copper text-[#1A1410] border-copper"
                  : isVisited
                  ? "bg-teal/15 text-teal border-teal/40"
                  : "bg-surface2 text-muted border-surface2"
              }`}
            >
              {labelMap[lane]}
            </div>
            {i < order.length - 1 && <div className={`w-4 h-px ${isVisited ? "bg-teal/50" : "bg-surface2"}`} />}
          </div>
        );
      })}
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
  onTransition: (id: string, action: string, targetLane?: string, extra?: Record<string, any>) => void;
}) {
  const [referOpen, setReferOpen] = useState(false);
  const [targetLane, setTargetLane] = useState("SOFTWARE");
  const [readyOpen, setReadyOpen] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [includeCard, setIncludeCard] = useState(false);

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

        <ReferralFlow history={ticket.history} currentLane={ticket.lane} />

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
              <button onClick={() => setReadyOpen((v) => !v)} className="flex-1 bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2.5">
                تکمیل و آماده تحویل
              </button>
            </div>
            {readyOpen && (
              <div className="bg-surface2 border border-surface2 rounded-lg p-3 mt-2.5 space-y-2">
                <label className="block text-[11px] text-muted">قیمت حدودی/نهایی (تومان) — در پیامک به مشتری درج می‌شود</label>
                <input type="number" className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={estimatedCost} onChange={(e) => setEstimatedCost(+e.target.value)} />
                <label className="flex items-center gap-2 text-[11px] text-muted">
                  <input type="checkbox" checked={includeCard} onChange={(e) => setIncludeCard(e.target.checked)} />
                  ارسال شماره کارت مغازه در همین پیامک
                </label>
                <button
                  onClick={() => onTransition(ticket.id, "ready", undefined, { estimatedCost: estimatedCost || undefined, includeCardInSms: includeCard })}
                  className="w-full bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2">
                  تأیید و ارسال پیامک
                </button>
              </div>
            )}
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

  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [modelMode, setModelMode] = useState<"select" | "custom">("select");
  const [templates, setTemplates] = useState<{ id: string; lane: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/device-catalog").then((r) => r.json()).then((d) => {
      setCatalog(d.catalog ?? {});
      setFavoriteBrands(d.favoriteBrands ?? []);
    });
    fetch("/api/issue-templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? []));
  }, []);

  const brandList = [...favoriteBrands, ...Object.keys(catalog).filter((b) => !favoriteBrands.includes(b))];
  const modelsForBrand = brand ? catalog[brand] ?? [] : [];
  const laneTemplates = templates.filter((t) => t.lane === form.lane);

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
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="font-extrabold text-base mb-1">پذیرش دستگاه جدید</div>
        <div className="text-xs text-muted mb-4">اطلاعات مشتری و دستگاه را وارد کنید</div>

        {[
          ["نام مشتری", "customerName", "text"],
          ["شماره تماس", "customerPhone", "tel"],
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

        <label className="block text-xs text-muted mb-1">برند گوشی</label>
        <select
          className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={brand}
          onChange={(e) => { setBrand(e.target.value); setForm({ ...form, deviceModel: "" }); setModelMode("select"); }}
        >
          <option value="">انتخاب برند...</option>
          {brandList.map((b) => <option key={b} value={b}>{b}{favoriteBrands.includes(b) ? " ⭐" : ""}</option>)}
          <option value="__custom__">سایر / برند دیگر</option>
        </select>

        {brand === "__custom__" ? (
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">نام برند و مدل (دستی)</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
              placeholder="مثلاً: Tecno Spark 10" />
          </div>
        ) : brand ? (
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">مدل</label>
            {modelMode === "select" ? (
              <select
                className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
                value={form.deviceModel}
                onChange={(e) => e.target.value === "__custom__" ? setModelMode("custom") : setForm({ ...form, deviceModel: e.target.value })}
              >
                <option value="">انتخاب مدل...</option>
                {modelsForBrand.map((m) => <option key={m} value={`${brand} ${m}`}>{m}</option>)}
                <option value="__custom__">مدل دیگر / نوشتن دستی</option>
              </select>
            ) : (
              <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
                value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
                placeholder={`${brand} ...`} />
            )}
          </div>
        ) : null}

        <div className="mb-1">
          <label className="block text-xs text-muted mb-1">IMEI (اختیاری)</label>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
            value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
        </div>

        <div className="mb-2">
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

        {laneTemplates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {laneTemplates.map((t) => (
              <button key={t.id} type="button"
                onClick={() => setForm({ ...form, issueInitial: form.issueInitial ? `${form.issueInitial}، ${t.label}` : t.label })}
                className="text-[10px] bg-surface2 hover:bg-copper hover:text-[#1A1410] transition rounded-full px-2.5 py-1">
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">شرح عیب</label>
          <textarea
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.issueInitial}
            onChange={(e) => setForm({ ...form, issueInitial: e.target.value })}
          />
        </div>

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
          ثبت پذیرش
        </button>
      </div>
    </div>
  );
}
