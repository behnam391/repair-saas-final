"use client";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PatternLockInput from "@/components/PatternLockInput";

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
  assignedToId?: string | null;
  technicianReportedCost?: number | null;
  technicianNote?: string | null;
  devicePasscode?: string | null;
  devicePasscodeType?: string | null;
  customerDamageNotes?: string | null;
  customer: { name: string; phone: string };
  history: { action: string; lane: string; note?: string; createdAt: string; tech?: { name: string } }[];
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const myRole = (session?.user as any)?.role;
  const myId = (session?.user as any)?.id;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  // Mobile accordion: which lanes are collapsed. Starts empty (all open);
  // only affects narrow screens — desktop always shows every column.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

      {/* Search — filters every lane live by device, customer, number, or issue. */}
      <div className="relative mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 جستجو: مدل گوشی، نام مشتری، شماره تیکت..."
          className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs bg-surface rounded-full w-6 h-6"
            title="پاک کردن"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted text-sm text-center py-10">در حال بارگذاری...</p>
      ) : (
        /* Mobile: lanes stack vertically (each collapsible). Desktop (sm+):
           classic side-by-side columns. */
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 sm:overflow-x-auto pb-3">
          {LANES.map((lane) => {
            const q = query.trim().toLowerCase();
            const items = tickets.filter(
              (t) =>
                t.lane === lane.key &&
                (!q ||
                  t.deviceModel.toLowerCase().includes(q) ||
                  t.customer.name.toLowerCase().includes(q) ||
                  t.customer.phone.includes(q) ||
                  String(t.no).includes(q) ||
                  (t.issueInitial ?? "").toLowerCase().includes(q))
            );
            const isCollapsed = !!collapsed[lane.key];
            return (
              <div key={lane.key} className="w-full sm:flex-none sm:w-72 bg-surface border border-surface2 rounded-2xl">
                {/* The whole lane header is a collapse toggle — on every
                    screen size (web and phone alike). */}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [lane.key]: !c[lane.key] }))}
                  className={`w-full flex justify-between items-center px-3 py-2.5 text-right ${
                    isCollapsed ? "" : "border-b border-surface2"
                  }`}
                >
                  <span className="font-bold text-[13px]">{lane.label}</span>
                  <span className="flex items-center gap-2">
                    <span className={`mono text-xs ${items.length > 0 ? "text-copper font-bold" : "text-muted"}`}>{items.length}</span>
                    <span className={`text-muted text-[10px] transition-transform ${isCollapsed ? "" : "rotate-180"}`}>▼</span>
                  </span>
                </button>
                <div className={`${isCollapsed ? "hidden" : "flex"} p-2.5 flex-col gap-2.5 max-h-[70vh] overflow-y-auto`}>
                  {items.length === 0 && (
                    <div className="text-muted text-xs text-center py-6 border border-dashed border-surface2 rounded-lg">
                      دستگاهی در این مرحله نیست
                    </div>
                  )}
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOpenTicket(t)}
                      className={`repair-tag card-hover ${t.status === "READY" ? "tag-ready" : t.status === "AWAITING_APPROVAL" ? "tag-awaiting" : t.status === "IN_PROGRESS" ? "tag-progress" : ""} text-right bg-surface2 rounded-xl p-3 pr-4 hover:brightness-110 transition`}
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-bold">{t.deviceModel}</span>
                        <span className="mono text-muted">#{t.no}</span>
                      </div>
                      <div className="text-[11px] text-muted mt-1">{t.customer.name}</div>
                      <div className="text-xs mt-1.5 text-[#C7CAD1]">{t.issueInitial}</div>
                      {t.status === "AWAITING_APPROVAL" && (
                        <div className="text-[10px] text-danger font-semibold mt-1.5">⏳ منتظر تأیید هزینه</div>
                      )}
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
          myRole={myRole}
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
  myRole,
  onClose,
  onTransition,
}: {
  ticket: Ticket;
  myRole?: string;
  onClose: () => void;
  onTransition: (id: string, action: string, targetLane?: string, extra?: Record<string, any>) => void;
}) {
  const [referOpen, setReferOpen] = useState(false);
  const [readyOpen, setReadyOpen] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [includeCard, setIncludeCard] = useState(false);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [reportedCost, setReportedCost] = useState(0);
  const [reportNote, setReportNote] = useState("");
  const [approvedCost, setApprovedCost] = useState(ticket.technicianReportedCost ?? 0);
  const [wage, setWage] = useState(0);
  const isOwner = myRole === "OWNER";

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

        {(ticket.devicePasscode || ticket.customerDamageNotes) && (
          <div className="bg-surface2 border border-surface2 rounded-lg p-2.5 mb-4 space-y-1.5">
            {ticket.devicePasscode && (
              <div className="text-xs">
                <span className="text-muted">رمز گوشی ({ticket.devicePasscodeType === "PATTERN" ? "الگو" : ticket.devicePasscodeType === "PASSWORD" ? "پسورد" : "پین"}): </span>
                <span className="mono font-bold">{ticket.devicePasscode}</span>
              </div>
            )}
            {ticket.customerDamageNotes && (
              <div className="text-xs"><span className="text-muted">توضیحات مشتری: </span>{ticket.customerDamageNotes}</div>
            )}
          </div>
        )}

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

        {ticket.status === "AWAITING_APPROVAL" ? (
          <div className="bg-amber/10 border border-amber/40 rounded-lg p-3 mb-2">
            <div className="text-xs font-bold text-amber mb-1">در انتظار تأیید مدیر</div>
            {ticket.technicianReportedCost && (
              <div className="text-xs mb-1">مبلغ پیشنهادی تعمیرکار: <span className="mono">{ticket.technicianReportedCost.toLocaleString("fa-IR")}</span> تومان</div>
            )}
            {ticket.technicianNote && <div className="text-xs text-muted mb-2">{ticket.technicianNote}</div>}

            {isOwner ? (
              <div className="space-y-2 mt-2">
                <label className="block text-[11px] text-muted">مبلغ نهایی تأییدشده (تومان)</label>
                <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={approvedCost} onChange={(e) => setApprovedCost(num(e.target.value))} />
                <label className="block text-[11px] text-muted">دستمزد این تعمیرکار (تومان)</label>
                <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={wage} onChange={(e) => setWage(num(e.target.value))} />
                <div className="flex gap-2">
                  <button
                    onClick={() => onTransition(ticket.id, "approve-cost", undefined, { approvedCost, technicianWage: wage })}
                    className="flex-1 bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2">
                    تأیید مبلغ
                  </button>
                  <button
                    onClick={() => onTransition(ticket.id, "send-back", undefined, { note: "لطفاً هزینه را بازبینی کنید" })}
                    className="flex-1 bg-surface border border-surface2 text-xs font-semibold rounded-lg py-2">
                    بازگشت برای اصلاح
                  </button>
                </div>
                <p className="text-[10px] text-muted">بعد از تأیید، از دکمه «تکمیل و آماده تحویل» برای اطلاع مشتری استفاده کنید.</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted">به‌محض تأیید مدیر، مرحله بعدی اینجا نمایش داده می‌شود.</p>
            )}
          </div>
        ) : null}

        {ticket.lane !== "READY" ? (
          <>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onTransition(ticket.id, "start")} className="flex-1 bg-copper text-[#1A1410] text-xs font-bold rounded-lg py-2.5">
                شروع/ادامه کار
              </button>
              <button onClick={() => setReferOpen((v) => !v)} className="flex-1 bg-surface2 border border-surface2 text-xs font-semibold rounded-lg py-2.5">
                ارجاع به بخش دیگر
              </button>
              {isOwner ? (
                <button onClick={() => setReadyOpen((v) => !v)} className="flex-1 bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2.5">
                  تکمیل و آماده تحویل
                </button>
              ) : (
                <button onClick={() => setSubmitOpen((v) => !v)} className="flex-1 bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2.5">
                  ثبت هزینه برای تأیید مدیر
                </button>
              )}
            </div>
            {submitOpen && (
              <div className="bg-surface2 border border-surface2 rounded-lg p-3 mt-2.5 space-y-2">
                <label className="block text-[11px] text-muted">هزینه پیشنهادی (تومان)</label>
                <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={reportedCost} onChange={(e) => setReportedCost(num(e.target.value))} />
                <label className="block text-[11px] text-muted">یادداشت برای مدیر (قطعات مصرفی و...)</label>
                <textarea className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={reportNote} onChange={(e) => setReportNote(e.target.value)} />
                <button
                  onClick={() => onTransition(ticket.id, "submit-for-approval", undefined, { technicianReportedCost: reportedCost || undefined, note: reportNote || undefined })}
                  className="w-full bg-teal text-[#0E211E] text-xs font-bold rounded-lg py-2">
                  ارسال برای تأیید
                </button>
              </div>
            )}
            {readyOpen && (
              <div className="bg-surface2 border border-surface2 rounded-lg p-3 mt-2.5 space-y-2">
                <label className="block text-[11px] text-muted">قیمت حدودی/نهایی (تومان) — در پیامک به مشتری درج می‌شود</label>
                <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                  value={estimatedCost} onChange={(e) => setEstimatedCost(num(e.target.value))} />
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
              <div className="bg-surface2 border border-surface2 rounded-xl p-3 mt-2.5">
                <div className="text-[11px] text-muted mb-2 font-bold">به کدام بخش ارجاع شود؟</div>
                <div className="flex flex-col gap-2">
                  {LANES.filter((l) => l.key !== ticket.lane && l.key !== "READY").map((l) => (
                    <button
                      key={l.key}
                      onClick={() => onTransition(ticket.id, "refer", l.key)}
                      className="w-full flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 text-sm font-bold hover:border-copper active:bg-copper/15 transition"
                    >
                      <span>{l.label}</span>
                      <span className="text-copper">←</span>
                    </button>
                  ))}
                </div>
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
    devicePasscode: "", devicePasscodeType: "PIN" as string, customerDamageNotes: "", receiptAck: "NO_SIGNATURE" as string,
  });
  const [collectPasscode, setCollectPasscode] = useState(false);
  const [error, setError] = useState("");
  // Step wizard: 1=customer, 2=device, 3=issue+confirm — keeps the intake
  // form short and phone-friendly instead of one long scroll.
  const [step, setStep] = useState(1);
  const STEPS = ["مشتری", "دستگاه", "ایراد", "تأیید"];

  function nextStep() {
    setError("");
    if (step === 1 && (!form.customerName.trim() || !form.customerPhone.trim())) {
      setError("نام و شماره تماس مشتری را وارد کنید");
      return;
    }
    if (step === 2 && !form.deviceModel.trim()) {
      setError("برند و مدل دستگاه را انتخاب کنید");
      return;
    }
    setStep(step + 1);
  }

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
    const payload = { ...form, devicePasscode: collectPasscode ? form.devicePasscode : "" };
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
        <div className="font-extrabold text-base mb-3">پذیرش دستگاه جدید</div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "active" : "next";
            return (
              <div key={label} className="flex items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  state === "done" ? "bg-teal text-white" : state === "active" ? "bg-copper text-white" : "bg-surface2 text-muted"
                }`}>
                  {state === "done" ? "✓" : n}
                </div>
                <span className={`text-[10px] whitespace-nowrap ${state === "active" ? "font-bold" : "text-muted"}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 ${n < step ? "bg-teal" : "bg-surface2"}`} />}
              </div>
            );
          })}
        </div>

        {step === 1 && (<>
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
        </>)}

        {step === 2 && (<>
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
        </>)}

        {step === 3 && (<>
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

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">توضیحات مشتری درباره آسیب‌دیدگی یا تعمیر قبلی (اختیاری)</label>
          <textarea
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            placeholder="مثلاً: قبلاً یک‌بار صفحه تعویض شده، یا خط روی بدنه از قبل بوده"
            value={form.customerDamageNotes}
            onChange={(e) => setForm({ ...form, customerDamageNotes: e.target.value })}
          />
        </div>
        </>)}

        {step === 4 && (<>
        <label className="flex items-center gap-2 text-xs text-muted mb-2">
          <input type="checkbox" checked={collectPasscode} onChange={(e) => setCollectPasscode(e.target.checked)} />
          دریافت رمز عبور صفحه گوشی از مشتری (برای تست بعد از تعمیر)
        </label>
        {collectPasscode && (
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              {[
                ["PIN", "پین عددی"],
                ["PASSWORD", "رمز/پسورد"],
                ["PATTERN", "الگو"],
              ].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setForm({ ...form, devicePasscodeType: val, devicePasscode: "" })}
                  className={`flex-1 text-[11px] rounded-lg py-1.5 border transition ${
                    form.devicePasscodeType === val ? "bg-copper text-[#1A1410] border-copper" : "bg-surface2 border-surface2 text-muted"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {form.devicePasscodeType === "PATTERN" ? (
              <PatternLockInput value={form.devicePasscode} onChange={(v) => setForm({ ...form, devicePasscode: v })} />
            ) : (
              <input
                type={form.devicePasscodeType === "PIN" ? "tel" : "text"}
                className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
                placeholder={form.devicePasscodeType === "PIN" ? "مثلاً: 1234" : "رمز عبور"}
                value={form.devicePasscode}
                onChange={(e) => setForm({ ...form, devicePasscode: e.target.value })}
              />
            )}
            <p className="text-[10px] text-muted mt-2">این اطلاعات فقط برای کارکنان همین مغازه قابل مشاهده است.</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-muted mb-2">نحوه تأیید پذیرش دستگاه</label>
          <div className="space-y-1.5">
            {[
              ["SHOP_PRINTED_SIGNED", "رسید چاپی مغازه را امضا کرد"],
              ["SITE_PRINTED_SIGNED", "رسید چاپی سایت را امضا کرد"],
              ["NO_SIGNATURE", "بدون امضا و بدون نیاز به فیش، دستگاه پذیرش شد"],
            ].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 text-xs bg-surface2 rounded-lg px-3 py-2 cursor-pointer">
                <input type="radio" name="receiptAck" checked={form.receiptAck === val}
                  onChange={() => setForm({ ...form, receiptAck: val })} />
                {label}
              </label>
            ))}
          </div>
        </div>
        </>)}

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        {/* Wizard navigation */}
        <div className="flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setError(""); setStep(step - 1); }}
              className="flex-1 bg-surface2 border border-border font-bold rounded-lg py-2.5 text-sm"
            >
              → قبلی
            </button>
          )}
          {step < STEPS.length ? (
            <button type="button" onClick={nextStep} className="flex-[2] bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
              بعدی ←
            </button>
          ) : (
            <button onClick={submit} className="flex-[2] bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
              ✓ ثبت پذیرش
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
