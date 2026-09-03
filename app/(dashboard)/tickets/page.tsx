"use client";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import PatternLockInput from "@/components/PatternLockInput";
import ComboBox from "@/components/ComboBox";
import TicketChat from "@/components/TicketChat";
import AiIntakeHelper from "@/components/AiIntakeHelper";
import CustomerQuickPick from "@/components/CustomerQuickPick";
import PartnerQuickPick from "@/components/PartnerQuickPick";
import MorningInsights from "@/components/MorningInsights";
import AdBanner from "@/components/AdBanner";
import { useIsNativeApp } from "@/components/NativeAppContext";
import { toLatinDigits, isValidMobile } from "@/lib/phone";
import { COMPUTER_ACCESSORIES, COMPUTER_BRANDS, COMPUTER_DEVICE_TYPES, COMPUTER_LANE_LABELS, COMPUTER_OS_OPTIONS, COMPUTER_QUICK_ISSUES, computerAccessoryLabels, computerDeviceTypeLabel } from "@/lib/computer-intake";
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, BarChart3, Boxes, Check, ChevronDown, CircuitBoard, Clock3, Cpu, FileText, GitBranch, Handshake, LockKeyhole, MessageCircle, MonitorSmartphone, Play, Plus, Printer, Search, ShieldCheck, Smartphone, UserRound, UsersRound, Wrench, X } from "lucide-react";

const LANES = [
  { key: "HARDWARE", label: "سخت‌افزار", hint: "تعمیرات فیزیکی", Icon: Wrench, tone: "blue" },
  { key: "SOFTWARE", label: "نرم‌افزار", hint: "فلش و بازیابی", Icon: Cpu, tone: "violet" },
  { key: "BOARD", label: "تخصصی", hint: "برد و هارد", Icon: CircuitBoard, tone: "amber" },
  { key: "READY", label: "آماده تحویل", hint: "تکمیل‌شده", Icon: BadgeCheck, tone: "green" },
] as const;

type Ticket = {
  id: string;
  no: number;
  deviceModel: string;
  deviceCategory?: string;
  deviceType?: string | null;
  deviceBrand?: string | null;
  operatingSystem?: string | null;
  accessories?: string | null;
  issueInitial: string;
  lane: string;
  status: string;
  assignedToId?: string | null;
  estimatedCost?: number | null;
  finalCost?: number | null;
  technicianReportedCost?: number | null;
  technicianNote?: string | null;
  devicePasscode?: string | null;
  devicePasscodeType?: string | null;
  hasPasscode?: boolean;
  customerDamageNotes?: string | null;
  intakeSource?: string;
  partnerName?: string | null;
  partnerPhone?: string | null;
  createdAt?: string;
  assignedTo?: { name: string } | null;
  invoice?: { id: string; total: number; paid: boolean; paidAmount: number } | null;
  customer: { name: string; phone: string };
  history: { action: string; lane: string; note?: string; createdAt: string; tech?: { name: string } }[];
};

export default function TicketsPage() {
  const isNativeApp = useIsNativeApp();
  const { data: session } = useSession();
  const myRole = (session?.user as any)?.role;
  const myId = (session?.user as any)?.id;
  const mySpecialty = (session?.user as any)?.specialty as string | null | undefined;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<string[]>(["MOBILE"]);
  const [newTicketCategory, setNewTicketCategory] = useState("MOBILE");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [singleOperator, setSingleOperator] = useState(false);
  const [monthlyChart, setMonthlyChart] = useState<{ label: string; total: number }[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<{ todayRevenue: number; todayProfit: number } | null>(null);
  const [performanceOpen, setPerformanceOpen] = useState(true);
  const [sideDashboardOpen, setSideDashboardOpen] = useState(true);
  // Mobile accordion: which lanes are collapsed. Starts empty (all open);
  // only affects narrow screens — desktop always shows every column.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const activeCount = tickets.filter((t) => t.lane !== "READY").length;
  const readyCount = tickets.filter((t) => t.lane === "READY").length;
  const waitingCount = tickets.filter((t) => t.status === "AWAITING_APPROVAL").length;
  const displayName = (session?.user as any)?.name?.trim() || "مدیر تعمیرگاه";

  async function load() {
    setLoading(true);
    const [ticketRes, shopRes, staffRes] = await Promise.all([
      fetch("/api/tickets"),
      fetch("/api/shop"),
      fetch("/api/staff"),
    ]);
    const data = await ticketRes.json();
    setTickets(data.tickets ?? []);
    if (shopRes.ok && staffRes.ok) {
      const shop = (await shopRes.json()).shop;
      const categories = (shop?.serviceCategories || "MOBILE").split(",").filter((item: string) => item === "MOBILE" || item === "COMPUTER");
      setServiceCategories(categories.length ? categories : ["MOBILE"]);
      const staff = (await staffRes.json()).staff ?? [];
      const activeStaffCount = staff.filter((member: any) => member.active).length;
      setSingleOperator(shop?.businessSize === "SOLO" || activeStaffCount <= 1);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const compact = window.matchMedia("(max-width: 760px)").matches;
    const savedPerformance = window.localStorage.getItem("peyvo.dashboard.performanceOpen");
    const savedSide = window.localStorage.getItem("peyvo.dashboard.sideOpen");
    setPerformanceOpen(savedPerformance === null ? !compact : savedPerformance === "1");
    setSideDashboardOpen(savedSide === null ? !compact : savedSide === "1");
    const pageParams = new URLSearchParams(window.location.search);
    if (pageParams.get("new") === "1") {
      const requestedCategory = pageParams.get("device");
      if (requestedCategory === "MOBILE" || requestedCategory === "COMPUTER") setNewTicketCategory(requestedCategory);
      setShowNew(true);
      window.history.replaceState({}, "", "/tickets");
    }
  }, []);

  function togglePerformance() {
    setPerformanceOpen((current) => {
      window.localStorage.setItem("peyvo.dashboard.performanceOpen", current ? "0" : "1");
      return !current;
    });
  }

  function toggleSideDashboard() {
    setSideDashboardOpen((current) => {
      window.localStorage.setItem("peyvo.dashboard.sideOpen", current ? "0" : "1");
      return !current;
    });
  }

  useEffect(() => {
    if (myRole !== "OWNER") return;
    Promise.all([fetch("/api/reports/monthly-revenue"), fetch("/api/dashboard/insights")]).then(async ([chartRes, insightRes]) => {
      if (chartRes.ok) setMonthlyChart((await chartRes.json()).months ?? []);
      if (insightRes.ok) setDashboardMetrics((await insightRes.json()).metrics ?? null);
    }).catch(() => undefined);
  }, [myRole]);

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
    const result = await res.json().catch(() => ({}));
    await load();
    setOpenTicket(null);
    if (action === "ready") flash(result.sms?.sent ? "📩 پیامک آماده‌تحویل برای مشتری ارسال شد" : result.sms?.message || "دستگاه آماده‌تحویل ثبت شد، اما پیامک ارسال نشد");
  }

  return (
    <div className="dashboard-page p-3 sm:p-5 max-w-[1600px] mx-auto">
      <div className="dashboard-hero dashboard-command-head">
        <div>
          <div className="dashboard-kicker"><span /> مرکز فرمان تعمیرگاه</div>
          <h1>خوش آمدید، {displayName} <span aria-hidden="true">👋</span></h1>
          <p>امروز تعمیرگاه را از یک نمای روشن، سریع و یکپارچه مدیریت کنید.</p>
        </div>
        <div className="dashboard-head-actions">
          {myRole === "OWNER" && <Link href="/reports" className="dashboard-secondary-action"><BarChart3 size={18} /> گزارش‌ها</Link>}
          <button onClick={() => { setNewTicketCategory(serviceCategories[0] || "MOBILE"); setShowNew(true); }} className="dashboard-primary-action"><Plus size={19} /> پذیرش دستگاه</button>
        </div>
      </div>

      <section className="dashboard-overview-grid">
        <div className="dashboard-stats">
          <div className="dashboard-stat"><span className="is-blue">{myRole === "OWNER" ? <BarChart3 size={20} /> : <Smartphone size={20} />}</span><div><small>{myRole === "OWNER" ? "درآمد امروز" : "کل دستگاه‌ها"}</small><b>{myRole === "OWNER" ? `${(dashboardMetrics?.todayRevenue ?? 0).toLocaleString("fa-IR")}` : tickets.length.toLocaleString("fa-IR")}</b><p>{myRole === "OWNER" ? "تومان · بر اساس فاکتورها" : "پرونده ثبت‌شده"}</p></div></div>
          <div className="dashboard-stat"><span className="is-green"><BadgeCheck size={20} /></span><div><small>آماده تحویل</small><b>{readyCount.toLocaleString("fa-IR")}</b><p>دستگاه تکمیل‌شده</p></div></div>
          <div className="dashboard-stat"><span className="is-amber"><Clock3 size={20} /></span><div><small>در انتظار تأیید</small><b>{waitingCount.toLocaleString("fa-IR")}</b><p>نیازمند پیگیری</p></div></div>
          <div className="dashboard-stat"><span className="is-violet"><Wrench size={20} /></span><div><small>تعمیرات فعال</small><b>{activeCount.toLocaleString("fa-IR")}</b><p>در جریان تعمیر</p></div></div>
        </div>
        <DashboardAssistant onNew={() => setShowNew(true)} />
      </section>

      {myRole === "OWNER" && <>
        <div className={`repair-command-grid ${sideDashboardOpen ? "" : "is-side-collapsed"}`}>
          <RepairAnalytics tickets={tickets} months={monthlyChart} open={performanceOpen} onToggle={togglePerformance} />
          <section className={`repair-side-panel ${sideDashboardOpen ? "is-open" : "is-collapsed"}`}>
            <button type="button" className="repair-side-panel-head" onClick={toggleSideDashboard} aria-expanded={sideDashboardOpen}>
              <span><b>داشبورد روزانه</b><small>هشدارها و میانبرهای کاربردی</small></span>
              <ChevronDown size={18} />
            </button>
            {sideDashboardOpen && <div className="repair-command-side">
              <MorningInsights />
              <RepairQuickActions onNew={() => setShowNew(true)} />
            </div>}
          </section>
        </div>
        <ActiveRepairTable tickets={tickets.slice(0, 5)} onOpen={setOpenTicket} />
        <AdBanner />
      </>}

      {/* Search — filters every lane live by device, customer, number, or issue. */}
      <div className="dashboard-toolbar">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی مدل گوشی، نام مشتری یا شماره تیکت..."
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="dashboard-search-clear"
            title="پاک کردن"
          >
            <X size={14} />
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
              <div key={lane.key} className={`ticket-lane lane-${lane.tone} w-full sm:flex-1 sm:min-w-[260px]`}>
                {/* The whole lane header is a collapse toggle — on every
                    screen size (web and phone alike). */}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [lane.key]: !c[lane.key] }))}
                  className={`ticket-lane-head ${
                    isCollapsed ? "" : "border-b border-surface2"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><i><lane.Icon size={16} /></i><span><b>{lane.label}</b><small>{lane.hint}</small></span></span>
                  <span className="flex items-center gap-2">
                    <span className={`mono text-xs ${items.length > 0 ? "text-copper font-bold" : "text-muted"}`}>{items.length}</span>
                    <span className={`text-muted text-[10px] transition-transform ${isCollapsed ? "" : "rotate-180"}`}>▼</span>
                  </span>
                </button>
                <div className={`${isCollapsed ? "hidden" : "flex"} p-2.5 flex-col gap-2.5 max-h-[62vh] overflow-y-auto`}>
                  {items.length === 0 && (
                    <div className="text-muted text-xs text-center py-6 border border-dashed border-surface2 rounded-lg">
                      دستگاهی در این مرحله نیست
                    </div>
                  )}
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOpenTicket(t)}
                      className={`ticket-card repair-tag card-hover ${t.status === "READY" ? "tag-ready" : t.status === "AWAITING_APPROVAL" ? "tag-awaiting" : t.status === "IN_PROGRESS" ? "tag-progress" : ""}`}
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
          singleOperator={singleOperator}
          onClose={() => setOpenTicket(null)}
          onTransition={transition}
        />
      )}
      {showNew && <NewTicketModal defaultLane={mySpecialty} defaultDeviceCategory={newTicketCategory} serviceCategories={serviceCategories} singleOperator={singleOperator} webPartnerIntake={!isNativeApp} onClose={() => setShowNew(false)} onCreated={load} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#1B302D] border border-teal text-teal text-xs px-4 py-2.5 rounded-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function DashboardAssistant({ onNew }: { onNew: () => void }) {
  return <aside className="dashboard-assistant-card">
    <div className="dashboard-assistant-visual" aria-hidden="true">
      <Image src="/images/peyvo-ai-assistant-v2.png" alt="" width={165} height={225} priority />
    </div>
    <div className="dashboard-assistant-copy">
      <span><i /> دستیار هوشمند پیوو</span>
      <h2>کارهای مهم امروز، جلوی چشم شماست.</h2>
      <p>پذیرش‌ها، هشدارها و وضعیت تعمیرات را سریع‌تر دنبال کنید.</p>
      <button onClick={onNew}><Plus size={17} /> پذیرش جدید</button>
    </div>
  </aside>;
}

function RepairAnalytics({ tickets, months, open, onToggle }: { tickets: Ticket[]; months: { label: string; total: number }[]; open: boolean; onToggle: () => void }) {
  const width = 680, height = 178;
  const totals = months.map((m) => m.total);
  const max = Math.max(...totals, 1);
  const points = totals.map((value, index) => `${months.length <= 1 ? width / 2 : (index / (months.length - 1)) * width},${height - (value / max) * (height - 20)}`).join(" ");
  const area = points ? `0,${height} ${points} ${width},${height}` : "";
  const counts = LANES.map((lane) => ({ ...lane, count: tickets.filter((t) => t.lane === lane.key).length }));
  const total = Math.max(tickets.length, 1);
  let cursor = 0;
  const colors = ["#168df0", "#25bd72", "#f2a51a", "#986cff"];
  const gradient = counts.map((item, index) => { const start = cursor; cursor += (item.count / total) * 100; return `${colors[index]} ${start}% ${cursor}%`; }).join(",");
  return <section className={`repair-analytics-card ${open ? "is-open" : "is-collapsed"}`}>
    <header><div><b>نمای عملکرد تعمیرگاه</b><small>درآمد ۱۲ ماه اخیر و وضعیت تعمیرهای جاری</small></div><button type="button" onClick={onToggle} aria-expanded={open}><BarChart3 size={17} /><span>{open ? "جمع کردن" : "نمایش عملکرد"}</span><ChevronDown size={17} /></button></header>
    {open && <div className="repair-analytics-body">
      <div className="repair-line-chart">
        {months.length ? <><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polygon points={area} /><polyline points={points} /></svg><div>{months.map((m) => <small key={m.label}>{m.label}</small>)}</div></> : <div className="repair-empty-chart"><BarChart3 size={24} /><span>پس از ثبت اولین فاکتور، نمودار درآمد اینجا نمایش داده می‌شود.</span></div>}
      </div>
      <div className="repair-status-chart">
        <div className="repair-donut" style={{ background: tickets.length ? `conic-gradient(${gradient})` : "var(--color-surface2)" }}><i><b>{tickets.length.toLocaleString("fa-IR")}</b><small>تعمیر جاری</small></i></div>
        <div>{counts.map((item, index) => <span key={item.key}><i style={{ background: colors[index] }} /><em>{item.label}</em><b>{item.count.toLocaleString("fa-IR")}</b></span>)}</div>
      </div>
    </div>}
  </section>;
}

function RepairQuickActions({ onNew }: { onNew: () => void }) {
  return <section className="repair-quick-actions"><header><b>میانبرهای سریع</b><small>کارهای پرکاربرد روزانه</small></header><div>
    <button onClick={onNew}><Plus size={18} /><span>پذیرش جدید</span></button>
    <Link href="/invoices"><FileText size={18} /><span>فاکتور جدید</span></Link>
    <Link href="/customers"><UsersRound size={18} /><span>مشتری جدید</span></Link>
    <Link href="/inventory"><Boxes size={18} /><span>ورود قطعه</span></Link>
  </div></section>;
}

function ActiveRepairTable({ tickets, onOpen }: { tickets: Ticket[]; onOpen: (ticket: Ticket) => void }) {
  const laneLabel: Record<string, string> = { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی", READY: "آماده تحویل" };
  return <section className="repair-active-table"><header><div><b>تعمیرات فعال</b><small>آخرین پذیرش‌های در جریان</small></div><span>{tickets.length.toLocaleString("fa-IR")} مورد اخیر</span></header>
    {tickets.length ? <div className="repair-table-scroll"><div className="repair-table-head"><span>پذیرش</span><span>دستگاه</span><span>مشتری</span><span>تعمیرکار</span><span>وضعیت</span><span>تاریخ پذیرش</span></div>{tickets.map((ticket) => <button key={ticket.id} onClick={() => onOpen(ticket)}><span className="mono">#{ticket.no}</span><span>{ticket.deviceModel}</span><span>{ticket.customer.name}</span><span>{ticket.assignedTo?.name || "تخصیص‌نیافته"}</span><span><i className={`lane-${ticket.lane.toLowerCase()}`} />{laneLabel[ticket.lane] || ticket.lane}</span><span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("fa-IR") : "—"}</span></button>)}</div> : <div className="repair-table-empty">هنوز تعمیر فعالی ثبت نشده است.</div>}
  </section>;
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
  singleOperator,
  onClose,
  onTransition,
}: {
  ticket: Ticket;
  myRole?: string;
  singleOperator: boolean;
  onClose: () => void;
  onTransition: (id: string, action: string, targetLane?: string, extra?: Record<string, any>) => void;
}) {
  const [referOpen, setReferOpen] = useState(false);
  const [readyOpen, setReadyOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [includeCard, setIncludeCard] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliveryInvoice, setDeliveryInvoice] = useState(ticket.invoice ?? null);
  const [deliveryCost, setDeliveryCost] = useState(ticket.invoice?.total ?? ticket.finalCost ?? ticket.estimatedCost ?? 0);
  const [deliveryPaidAmount, setDeliveryPaidAmount] = useState(ticket.invoice?.paidAmount ?? (ticket.invoice?.paid ? ticket.invoice.total : 0));
  const [deliveryError, setDeliveryError] = useState("");
  const [delivering, setDelivering] = useState(false);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [reportedCost, setReportedCost] = useState(0);
  const [reportNote, setReportNote] = useState("");
  const [approvedCost, setApprovedCost] = useState(ticket.technicianReportedCost ?? 0);
  const [wage, setWage] = useState(0);
  const isOwner = myRole === "OWNER";

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  // Device passcode is no longer shipped with the ticket list; it is revealed
  // on demand through the audited endpoint below.
  const [passcode, setPasscode] = useState<string | null>(null);
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const passcodeTypeLabel =
    ticket.devicePasscodeType === "PATTERN" ? "الگو" : ticket.devicePasscodeType === "PASSWORD" ? "پسورد" : "پین";

  async function revealPasscode() {
    setPasscodeLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/passcode`);
      const data = await res.json();
      setPasscode(typeof data.passcode === "string" ? data.passcode : "");
    } catch {
      setPasscode("");
    } finally {
      setPasscodeLoading(false);
    }
  }

  function referToPartnerShop() {
    sessionStorage.setItem("peyvo-referral-draft", JSON.stringify({
      customerName: ticket.customer.name,
      customerPhone: ticket.customer.phone,
      deviceModel: ticket.deviceModel,
      issueNote: ticket.issueInitial,
    }));
    window.location.assign("/collaboration?newReferral=1");
  }

  async function confirmDelivery() {
    setDeliveryError("");
    setDelivering(true);
    try {
      const total = deliveryInvoice?.total ?? Math.max(0, deliveryCost);
      const paidAmount = Math.min(total, Math.max(0, deliveryPaidAmount));
      const invoiceResponse = deliveryInvoice
        ? await fetch(`/api/invoices/${deliveryInvoice.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paidAmount }),
          })
        : await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: ticket.id, laborCost: total, parts: [], applyTax: false, paidAmount }),
          });
      const invoiceData = await invoiceResponse.json().catch(() => ({}));
      if (!invoiceResponse.ok) {
        setDeliveryError(invoiceData.message || "ثبت اطلاعات مالی انجام نشد؛ دوباره تلاش کنید");
        return;
      }
      if (!deliveryInvoice && invoiceData.invoice) setDeliveryInvoice(invoiceData.invoice);
      await onTransition(ticket.id, "deliver");
    } catch {
      setDeliveryError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید");
    } finally {
      setDelivering(false);
    }
  }

  return (
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div
        className="ticket-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ticket-modal-head">
          <div className="ticket-modal-device"><span>{ticket.deviceCategory === "COMPUTER" ? <MonitorSmartphone size={20} /> : <Smartphone size={20} />}</span><div><h2>{ticket.deviceModel}</h2><p><UserRound size={12} />{ticket.customer.name} · {ticket.customer.phone}</p></div></div>
          <div className="flex items-center gap-2"><span className="ticket-number">#{ticket.no}</span><button onClick={onClose} className="ticket-modal-close"><X size={18} /></button></div>
        </div>

        <div className="ticket-modal-body">

        {ticket.deviceCategory === "COMPUTER" && (
          <div className="computer-ticket-summary">
            <span><small>نوع سیستم</small><b>{computerDeviceTypeLabel(ticket.deviceType)}</b></span>
            <span><small>برند</small><b>{ticket.deviceBrand || "—"}</b></span>
            <span><small>سیستم‌عامل</small><b>{ticket.operatingSystem || "نامشخص"}</b></span>
            <span><small>لوازم همراه</small><b>{computerAccessoryLabels(ticket.accessories).join("، ") || "بدون لوازم"}</b></span>
          </div>
        )}

        {(ticket.hasPasscode || ticket.customerDamageNotes) && (
          <div className="ticket-private-note">
            {ticket.hasPasscode && (
              <div className="text-xs flex items-center gap-2">
                <span className="text-muted">رمز {ticket.deviceCategory === "COMPUTER" ? "سیستم" : "گوشی"} ({passcodeTypeLabel}): </span>
                {passcode === null ? (
                  <button
                    type="button"
                    onClick={revealPasscode}
                    disabled={passcodeLoading}
                    className="mono font-bold underline decoration-dotted disabled:opacity-60"
                  >
                    {passcodeLoading ? "..." : "نمایش رمز"}
                  </button>
                ) : (
                  <span className="mono font-bold">{passcode || "—"}</span>
                )}
              </div>
            )}
            {ticket.customerDamageNotes && (
              <div className="text-xs"><span className="text-muted">توضیحات مشتری: </span>{ticket.customerDamageNotes}</div>
            )}
          </div>
        )}

        <AiIntakeHelper ticketId={ticket.id} />

        {ticket.intakeSource === "PARTNER" && (
          <div className="mb-3 rounded-xl border border-teal/30 bg-teal/10 p-3 text-xs">
            <b className="flex items-center gap-1.5 text-teal"><Handshake size={14} /> دریافت‌شده از همکار</b>
            <div className="mt-1 text-muted">{ticket.partnerName}{ticket.partnerPhone ? ` · ${ticket.partnerPhone}` : ""}</div>
          </div>
        )}

        <ReferralFlow history={ticket.history} currentLane={ticket.lane} />

        {/* Customer chat — collapsible, so the ticket detail stays compact. */}
        <div className="ticket-chat-block">
          <button
            onClick={() => setShowChat((v) => !v)}
            className="ticket-section-trigger"
          >
            <span><MessageCircle size={16} /> گفتگو با مشتری</span>
            <ChevronDown size={15} className={`text-muted transition-transform ${showChat ? "rotate-180" : ""}`} />
          </button>
          {showChat && (
            <div className="bg-surface2/50 border border-border border-t-0 rounded-b-xl p-2 -mt-1">
              <TicketChat endpoint={`/api/tickets/${ticket.id}/messages`} iAmCustomer={false} />
            </div>
          )}
        </div>

        <div className="ticket-history-list">
          <div className="ticket-section-label"><Clock3 size={14} /> تاریخچه فعالیت</div>
          {ticket.history.map((h, i) => (
            <div key={i} className="ticket-history-item">
              <div className="text-[13px] font-bold">{h.action}</div>
              <div className="text-[11px] mono text-muted mt-0.5">
                {h.tech?.name} · {new Date(h.createdAt).toLocaleString("fa-IR")}
              </div>
              {h.note && <div className="text-xs text-[#C7CAD1] mt-1.5">{h.note}</div>}
            </div>
          ))}
        </div>

        <a href={`/tickets/${ticket.id}/receipt`} target="_blank" className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-surface2 bg-surface2 py-2 text-xs font-bold text-copper">
          <Printer size={14} /> مشاهده و چاپ رسید پذیرش
        </a>

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
            <div className="ticket-action-grid">
              <button onClick={() => onTransition(ticket.id, "start")} className="ticket-action is-primary">
                <Play size={15} /> شروع/ادامه کار
              </button>
              <button onClick={() => singleOperator ? referToPartnerShop() : setReferOpen((v) => !v)} className="ticket-action">
                <GitBranch size={15} /> {singleOperator ? "ارجاع به مغازه همکار" : "ارجاع به بخش دیگر"}
              </button>
              {isOwner ? (
                <button onClick={() => setReadyOpen((v) => !v)} className="ticket-action is-success">
                  <BadgeCheck size={15} /> تکمیل و آماده تحویل
                </button>
              ) : (
                <button onClick={() => setSubmitOpen((v) => !v)} className="ticket-action is-success">
                  <Banknote size={15} /> ثبت هزینه برای تأیید مدیر
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
            {referOpen && !singleOperator && (
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
          <div>
            {!deliverOpen ? (
              <button onClick={() => setDeliverOpen(true)} className="w-full bg-copper text-[#1A1410] text-xs font-bold rounded-lg py-2.5">
                ثبت تحویل و وضعیت تسویه
              </button>
            ) : (
              <div className="rounded-xl border border-copper/40 bg-copper/5 p-3 space-y-2">
                <div className="text-xs font-bold">هزینه و تسویه هنگام تحویل {ticket.intakeSource === "PARTNER" ? `به ${ticket.partnerName || "همکار"}` : "به مشتری"}</div>
                {deliveryInvoice ? (
                  <>
                    <div className="flex justify-between rounded-lg bg-surface2 px-3 py-2 text-xs"><span>هزینه نهایی ثبت‌شده</span><b>{deliveryInvoice.total.toLocaleString("fa-IR")} تومان</b></div>
                    <p className="text-[10px] leading-5 text-muted">این مبلغ از فاکتور خوانده شده است؛ جزئیات هزینه و قطعات از بخش فاکتورها قابل ویرایش است.</p>
                  </>
                ) : (
                  <>
                    <label className="block text-[11px] text-muted">هزینه نهایی تعمیر (تومان)</label>
                    <input type="text" inputMode="numeric" dir="ltr" value={deliveryCost || ""} onChange={(event) => { const value = num(event.target.value); setDeliveryCost(value); setDeliveryPaidAmount((current) => Math.min(current, value)); }} className="w-full rounded-lg border border-surface2 bg-surface px-3 py-2 text-sm" placeholder="مثلاً ۴۹۰۰۰۰" />
                    <p className="rounded-lg bg-teal/10 p-2 text-[10px] text-teal">با تأیید تحویل، فاکتور این تعمیر به‌صورت خودکار ساخته می‌شود.</p>
                  </>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={() => setDeliveryPaidAmount(0)} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${deliveryPaidAmount === 0 ? "border-amber bg-amber/10 text-amber" : "border-surface2 bg-surface text-muted"}`}>نسیه</button>
                  <button type="button" onClick={() => setDeliveryPaidAmount(Math.min(deliveryInvoice?.total ?? deliveryCost, Math.max(1, deliveryPaidAmount)))} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${deliveryPaidAmount > 0 && deliveryPaidAmount < (deliveryInvoice?.total ?? deliveryCost) ? "border-copper bg-copper/10 text-copper" : "border-surface2 bg-surface text-muted"}`}>پرداخت بخشی</button>
                  <button type="button" onClick={() => setDeliveryPaidAmount(deliveryInvoice?.total ?? deliveryCost)} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${deliveryPaidAmount >= (deliveryInvoice?.total ?? deliveryCost) ? "border-teal bg-teal/10 text-teal" : "border-surface2 bg-surface text-muted"}`}>تسویه کامل</button>
                </div>
                <label className="block text-[11px] text-muted">مبلغ پرداخت‌شده تا این لحظه (تومان)</label>
                <input type="text" inputMode="numeric" dir="ltr" value={deliveryPaidAmount || ""} onChange={(event) => setDeliveryPaidAmount(Math.min(deliveryInvoice?.total ?? deliveryCost, num(event.target.value)))} className="w-full rounded-lg border border-surface2 bg-surface px-3 py-2 text-sm" />
                <div className="flex justify-between rounded-lg bg-surface2 px-3 py-2 text-xs"><span>مانده حساب</span><b className={(deliveryInvoice?.total ?? deliveryCost) - deliveryPaidAmount > 0 ? "text-amber" : "text-teal"}>{Math.max(0, (deliveryInvoice?.total ?? deliveryCost) - deliveryPaidAmount).toLocaleString("fa-IR")} تومان</b></div>
                {deliveryPaidAmount < (deliveryInvoice?.total ?? deliveryCost) && <p className="text-[10px] leading-5 text-muted">دستگاه تحویل می‌شود و مبلغ باقی‌مانده به‌عنوان طلب تعمیرگاه در فاکتورها باقی می‌ماند.</p>}
                {deliveryError && <p className="rounded-lg bg-danger/10 p-2 text-[10px] text-danger">{deliveryError}</p>}
                <div className="flex gap-2">
                  <button onClick={confirmDelivery} disabled={delivering} className="flex-1 rounded-lg bg-copper py-2 text-xs font-bold text-[#1A1410] disabled:opacity-60">{delivering ? "در حال ثبت..." : "تأیید تحویل"}</button>
                  <button onClick={() => setDeliverOpen(false)} className="flex-1 rounded-lg bg-surface2 py-2 text-xs">انصراف</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Available at any stage before the device is actually delivered —
            covers both "customer changed their mind mid-repair" and any
            other reason the shop needs to close the ticket without
            finishing it. */}
        <div className="mt-3 pt-3 border-t border-surface2">
          {!cancelOpen ? (
            <button onClick={() => setCancelOpen(true)} className="w-full text-danger text-[11px] font-semibold py-1">
              انصراف از تعمیر و بازگشت دستگاه به مشتری
            </button>
          ) : (
            <div className="bg-danger/10 border border-danger/40 rounded-lg p-3 space-y-2">
              <div className="text-[11px] font-bold text-danger">ثبت انصراف و بازگشت دستگاه</div>
              <p className="text-[10px] text-muted">این تیکت بسته می‌شود و از تابلوی فعال حذف می‌شود؛ بعداً از «سابقه و جستجو» با وضعیت «لغوشده» قابل مشاهده است.</p>
              <textarea
                className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                placeholder="دلیل انصراف (اختیاری)"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onTransition(ticket.id, "cancel", undefined, { note: cancelNote || undefined })}
                  className="flex-1 bg-danger text-white text-xs font-bold rounded-lg py-2">
                  بله، دستگاه بازگردانده شد
                </button>
                <button onClick={() => setCancelOpen(false)} className="flex-1 bg-surface border border-surface2 text-xs font-semibold rounded-lg py-2">
                  انصراف از این کار
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function NewTicketModal({ defaultLane, defaultDeviceCategory, serviceCategories, singleOperator, webPartnerIntake, onClose, onCreated }: { defaultLane?: string | null; defaultDeviceCategory: string; serviceCategories: string[]; singleOperator: boolean; webPartnerIntake: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", deviceModel: "", deviceCategory: defaultDeviceCategory === "COMPUTER" ? "COMPUTER" : "MOBILE", imei: "", issueInitial: "", lane: ["HARDWARE", "SOFTWARE", "BOARD"].includes(defaultLane || "") ? defaultLane! : "HARDWARE",
    deviceType: defaultDeviceCategory === "COMPUTER" ? "LAPTOP" : "", deviceBrand: "", operatingSystem: "", accessories: "",
    devicePasscode: "", devicePasscodeType: "PIN" as string, customerDamageNotes: "", receiptAck: "NO_SIGNATURE" as string,
    intakeSource: "CUSTOMER", partnerName: "", partnerPhone: "",
  });
  const [collectPasscode, setCollectPasscode] = useState(false);
  const [error, setError] = useState("");
  // Step wizard: 1=customer, 2=device, 3=issue+confirm — keeps the intake
  // form short and phone-friendly instead of one long scroll.
  const [step, setStep] = useState(1);
  const [createdTicket, setCreatedTicket] = useState<{ id: string; no: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const STEPS = ["مشتری", form.deviceCategory === "COMPUTER" ? "رایانه" : "دستگاه", "ایراد", "تأیید"];

  function nextStep() {
    setError("");
    const partnerWithoutCustomer = webPartnerIntake && form.intakeSource === "PARTNER";
    if (step === 1 && !partnerWithoutCustomer && (!form.customerName.trim() || !form.customerPhone.trim())) {
      setError("نام و شماره تماس مشتری را وارد کنید");
      return;
    }
    if (step === 1 && form.intakeSource === "PARTNER" && !form.partnerName.trim()) {
      setError("نام همکار تحویل‌دهنده را وارد کنید");
      return;
    }
    // Every repair-status SMS goes to this number. See lib/phone.ts.
    if (step === 1 && !partnerWithoutCustomer && !isValidMobile(form.customerPhone)) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد");
      return;
    }
    if (step === 1 && form.intakeSource === "PARTNER" && form.partnerPhone && !isValidMobile(form.partnerPhone)) {
      setError("شماره همکار باید با ۰۹ شروع شود و ۱۱ رقم باشد");
      return;
    }
    if (step === 2 && form.deviceCategory === "COMPUTER" && (!form.deviceType || !form.deviceBrand.trim() || !form.deviceModel.trim())) {
      setError("نوع دستگاه، برند و مدل یا مشخصات کامپیوتر را کامل کنید");
      return;
    }
    if (step === 2 && form.deviceCategory !== "COMPUTER" && !form.deviceModel.trim()) {
      setError("برند و مدل دستگاه را انتخاب کنید");
      return;
    }
    if (step === 3 && !form.issueInitial.trim()) {
      setError("شرح ایراد دستگاه را وارد کنید");
      return;
    }
    setStep(step + 1);
  }

  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
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

  function switchDeviceCategory(category: "MOBILE" | "COMPUTER") {
    setBrand("");
    setCollectPasscode(false);
    setForm((current) => ({
      ...current,
      deviceCategory: category,
      deviceType: category === "COMPUTER" ? "LAPTOP" : "",
      deviceBrand: "",
      operatingSystem: "",
      accessories: "",
      deviceModel: "",
      imei: "",
      devicePasscode: "",
      devicePasscodeType: "PIN",
    }));
  }

  function toggleComputerAccessory(key: string) {
    setForm((current) => {
      const selected = current.accessories.split(",").filter(Boolean);
      const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
      return { ...current, accessories: next.join(",") };
    });
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    const payload = {
      ...form,
      customerName: webPartnerIntake && form.intakeSource === "PARTNER" ? "" : form.customerName,
      customerPhone: webPartnerIntake && form.intakeSource === "PARTNER" ? "" : form.customerPhone,
      partnerPhone: form.partnerPhone || undefined,
      deviceType: form.deviceCategory === "COMPUTER" ? form.deviceType || undefined : undefined,
      operatingSystem: form.deviceCategory === "COMPUTER" ? form.operatingSystem || undefined : undefined,
      accessories: form.deviceCategory === "COMPUTER" ? form.accessories || undefined : undefined,
      devicePasscode: collectPasscode ? form.devicePasscode : "",
    };
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detailMessage = Array.isArray(data.details) ? data.details[0]?.message : "";
        setError(data.message || detailMessage || `ثبت پذیرش ناموفق بود (خطای ${res.status.toLocaleString("fa-IR")})`);
        return;
      }
      setCreatedTicket({ id: data.ticket.id, no: data.ticket.no });
      onCreated();
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ اینترنت را بررسی کرده و دوباره تلاش کنید");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdTicket) {
    return (
      <div className="ticket-modal-backdrop" onClick={onClose}>
        <div className={`intake-modal ${form.deviceCategory === "COMPUTER" ? "is-computer" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="p-6 text-center sm:p-8">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal/15 text-teal"><Check size={28} /></div>
            <h2 className="display-heading text-lg">پذیرش {form.deviceCategory === "COMPUTER" ? "کامپیوتر" : "موبایل"} با موفقیت ثبت شد</h2>
            <p className="mt-1 text-xs text-muted">کد پیگیری #{createdTicket.no}</p>
            <a href={`/tickets/${createdTicket.id}/receipt`} target="_blank" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-copper py-3 text-sm font-bold text-[#1A1410]">
              <Printer size={17} /> چاپ رسید پذیرش
            </a>
            <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl border border-surface2 bg-surface2 py-2.5 text-xs font-bold">بازگشت به تعمیرها</button>
          </div>
        </div>
      </div>

    );
  }

  return (
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div className={`intake-modal ${form.deviceCategory === "COMPUTER" ? "is-computer" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="ticket-modal-head">
          <div className="ticket-modal-device"><span>{form.deviceCategory === "COMPUTER" ? <MonitorSmartphone size={20} /> : <Smartphone size={20} />}</span><div><h2>پذیرش {form.deviceCategory === "COMPUTER" ? "کامپیوتر" : "موبایل"}</h2><p>{form.deviceCategory === "COMPUTER" ? "فرم تخصصی تجهیزات رایانه‌ای" : "اطلاعات را مرحله‌به‌مرحله ثبت کنید"}</p></div></div>
          <button onClick={onClose} className="ticket-modal-close"><X size={18} /></button>
        </div>

        <div className="intake-modal-body">

        {/* Step indicator */}
        <div className="intake-stepper">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "active" : "next";
            return (
              <div key={label} className={`intake-step is-${state}`}>
                <div>{state === "done" ? <Check size={13} /> : n}</div>
                <span>{label}</span>
                {i < STEPS.length - 1 && <i />}
              </div>
            );
          })}
        </div>

        <div className="intake-step-content">
        {step === 1 && (<>
        <div className="intake-content-title"><UserRound size={18} /><div><b>{webPartnerIntake && form.intakeSource === "PARTNER" ? "منبع دریافت دستگاه" : "اطلاعات مشتری"}</b><small>{webPartnerIntake && form.intakeSource === "PARTNER" ? "مشخصات همکار تحویل‌دهنده را ثبت کنید" : "مشخصات صاحب دستگاه را وارد کنید"}</small></div></div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setForm({ ...form, intakeSource: "CUSTOMER", partnerName: "", partnerPhone: "" })} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${form.intakeSource === "CUSTOMER" ? "border-copper bg-copper text-[#1A1410]" : "border-surface2 bg-surface2 text-muted"}`}>مراجعه مستقیم مشتری</button>
          <button type="button" onClick={() => setForm({ ...form, intakeSource: "PARTNER" })} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${form.intakeSource === "PARTNER" ? "border-teal bg-teal text-[#0B1512]" : "border-surface2 bg-surface2 text-muted"}`}>دریافت از همکار</button>
        </div>
        {form.intakeSource === "PARTNER" && (
          <div className="mb-4 rounded-xl border border-teal/30 bg-teal/5 p-3">
            <div className="mb-2 text-[11px] font-bold text-teal">مشخصات همکار تحویل‌دهنده</div>
            <PartnerQuickPick value={{ name: form.partnerName, phone: form.partnerPhone }} onChange={(partner) => setForm({ ...form, partnerName: partner.name, partnerPhone: partner.phone })} />
          </div>
        )}
        {(!webPartnerIntake || form.intakeSource === "CUSTOMER") && (<>
          <CustomerQuickPick onSelect={(person) => setForm({ ...form, customerName: person.name, customerPhone: person.phone })} />
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">نام مشتری</label>
            <input
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">شماره تماس</label>
            <input
              inputMode="tel" dir="ltr" maxLength={11} placeholder="09xxxxxxxxx"
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: toLatinDigits(e.target.value) })}
            />
          </div>
        </>)}
        </>)}

        {step === 2 && (<>
        <div className="intake-content-title">{form.deviceCategory === "COMPUTER" ? <MonitorSmartphone size={18} /> : <Smartphone size={18} />}<div><b>{form.deviceCategory === "COMPUTER" ? "پرونده فنی کامپیوتر" : "مشخصات موبایل"}</b><small>{form.deviceCategory === "COMPUTER" ? "نوع سیستم، سازنده، سیستم‌عامل و متعلقات" : "برند، مدل و شناسه دستگاه"}</small></div></div>
        {serviceCategories.length > 1 && <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => switchDeviceCategory("MOBILE")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${form.deviceCategory === "MOBILE" ? "border-copper bg-copper text-[#1A1410]" : "border-surface2 bg-surface2 text-muted"}`}><Smartphone size={16} /> موبایل</button>
          <button type="button" onClick={() => switchDeviceCategory("COMPUTER")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${form.deviceCategory === "COMPUTER" ? "border-teal bg-teal text-[#0B1512]" : "border-surface2 bg-surface2 text-muted"}`}><MonitorSmartphone size={16} /> کامپیوتر</button>
        </div>}

        {form.deviceCategory === "COMPUTER" ? (
          <div className="computer-intake-fields">
            <div className="computer-intake-note"><MonitorSmartphone size={20} /><span><b>پذیرش تخصصی رایانه</b><small>اطلاعات فنی و لوازمی که همراه دستگاه تحویل می‌گیرید ثبت می‌شود.</small></span></div>

            <label className="block text-xs text-muted mb-2">نوع دستگاه</label>
            <div className="computer-type-grid mb-4">
              {COMPUTER_DEVICE_TYPES.map((item) => <button key={item.key} type="button" onClick={() => setForm({ ...form, deviceType: item.key })} className={form.deviceType === item.key ? "is-active" : ""}><b>{item.label}</b><small>{item.hint}</small></button>)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-muted mb-1">سازنده یا برند</label>
                <ComboBox value={brand} onChange={(value) => { setBrand(value); setForm({ ...form, deviceBrand: value, deviceModel: "" }); }} options={COMPUTER_BRANDS} placeholder="مثلاً Lenovo یا اسمبل" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">مدل یا مشخصات روی بدنه</label>
                <input value={form.deviceModel.startsWith(`${brand} `) ? form.deviceModel.slice(brand.length + 1) : form.deviceModel} onChange={(event) => { const model = event.target.value; setForm({ ...form, deviceModel: model ? `${brand ? `${brand} ` : ""}${model}` : "" }); }} placeholder="مثلاً ThinkPad T480 یا Ryzen 5" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">سیستم‌عامل فعلی</label>
                <select value={form.operatingSystem} onChange={(event) => setForm({ ...form, operatingSystem: event.target.value })}><option value="">انتخاب کنید (اختیاری)</option>{COMPUTER_OS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">شماره سریال یا Service Tag</label>
                <input dir="ltr" className="mono" value={form.imei} onChange={(event) => setForm({ ...form, imei: event.target.value })} placeholder="Serial / Service Tag" />
              </div>
            </div>

            <label className="mt-4 block text-xs text-muted mb-2">لوازم همراه دستگاه</label>
            <div className="computer-accessory-grid">
              {COMPUTER_ACCESSORIES.map((item) => { const active = form.accessories.split(",").includes(item.key); return <button key={item.key} type="button" onClick={() => toggleComputerAccessory(item.key)} className={active ? "is-active" : ""}><Check size={13} />{item.label}</button>; })}
            </div>
          </div>
        ) : (<>
          <label className="block text-xs text-muted mb-1">برند گوشی</label>
          <div className="mb-3"><ComboBox value={brand} onChange={(value) => { setBrand(value); setForm({ ...form, deviceBrand: value, deviceModel: "" }); }} options={brandList} starred={favoriteBrands} placeholder="انتخاب یا تایپ برند..." /></div>
          {brand && <div className="mb-3"><label className="block text-xs text-muted mb-1">مدل</label><ComboBox value={form.deviceModel.startsWith(`${brand} `) ? form.deviceModel.slice(brand.length + 1) : form.deviceModel} onChange={(model) => setForm({ ...form, deviceModel: model ? `${brand} ${model}` : "" })} options={modelsForBrand} placeholder="انتخاب یا تایپ مدل..." /></div>}
          <div className="mb-1"><label className="block text-xs text-muted mb-1">IMEI (اختیاری)</label><input inputMode="numeric" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3 mono" value={form.imei} onChange={(event) => setForm({ ...form, imei: event.target.value })} /></div>
        </>)}
        </>)}

        {step === 3 && (<>
        <div className="intake-content-title"><Wrench size={18} /><div><b>{form.deviceCategory === "COMPUTER" ? "عیب و نوع خدمت رایانه" : "شرح ایراد"}</b><small>دستگاه به بخش مناسب ارجاع می‌شود</small></div></div>
        <div className="mb-2">
          <label className="block text-xs text-muted mb-1">مسیر اولیه تعمیر</label>
          {singleOperator && defaultLane ? (
            <div className="w-full rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-sm font-bold text-teal">
              {form.deviceCategory === "COMPUTER" ? COMPUTER_LANE_LABELS[form.lane] : LANES.find((lane) => lane.key === form.lane)?.label ?? "تخصص ثبت‌شده مغازه"}
            </div>
          ) : (
            <select
              className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.lane}
              onChange={(e) => setForm({ ...form, lane: e.target.value })}
            >
              {LANES.filter((l) => l.key !== "READY").map((l) => (
                <option key={l.key} value={l.key}>{form.deviceCategory === "COMPUTER" ? COMPUTER_LANE_LABELS[l.key] : l.label}</option>
              ))}
            </select>
          )}
        </div>

        {form.deviceCategory === "COMPUTER" ? (
          <div className="computer-issue-grid mb-3">
            {COMPUTER_QUICK_ISSUES.map((issue) => <button key={issue.label} type="button" onClick={() => setForm({ ...form, lane: issue.lane, issueInitial: form.issueInitial ? `${form.issueInitial}، ${issue.label}` : issue.label })}>{issue.label}</button>)}
          </div>
        ) : laneTemplates.length > 0 && (
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
          <label className="block text-xs text-muted mb-1">{form.deviceCategory === "COMPUTER" ? "شرح دقیق ایراد، صدای غیرعادی یا پیام خطا" : "شرح عیب"}</label>
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
            placeholder={form.deviceCategory === "COMPUTER" ? "مثلاً: دستگاه قبلاً باز شده، لولا شکستگی دارد یا اطلاعات مهم روی درایو است" : "مثلاً: قبلاً یک‌بار صفحه تعویض شده، یا خط روی بدنه از قبل بوده"}
            value={form.customerDamageNotes}
            onChange={(e) => setForm({ ...form, customerDamageNotes: e.target.value })}
          />
        </div>
        </>)}

        {step === 4 && (<>
        <div className="intake-content-title"><ShieldCheck size={18} /><div><b>تأیید نهایی</b><small>امنیت دستگاه و نحوه پذیرش</small></div></div>
        <label className="flex items-center gap-2 text-xs text-muted mb-2">
          <input type="checkbox" checked={collectPasscode} onChange={(e) => setCollectPasscode(e.target.checked)} />
          دریافت {form.deviceCategory === "COMPUTER" ? "رمز حساب کاربری سیستم" : "رمز ورود دستگاه"} از مشتری (برای تست بعد از تعمیر)
        </label>
        {collectPasscode && (
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              {(form.deviceCategory === "COMPUTER" ? [
                ["PIN", "Windows PIN"],
                ["PASSWORD", "رمز حساب"],
              ] : [
                ["PIN", "پین عددی"],
                ["PASSWORD", "رمز/پسورد"],
                ["PATTERN", "الگو"],
              ]).map(([val, label]) => (
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

        {error && <div className="auth-error mb-3">{error}</div>}
        </div>

        {/* Wizard navigation */}
        <div className="intake-navigation">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setError(""); setStep(step - 1); }}
              className="intake-button is-back"
            >
              <ArrowRight size={16} /> قبلی
            </button>
          )}
          {step < STEPS.length ? (
            <button type="button" onClick={nextStep} className="intake-button is-next">
              بعدی <ArrowLeft size={16} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="intake-button is-next disabled:cursor-wait disabled:opacity-60">
              <Check size={16} /> {submitting ? "در حال ثبت..." : "ثبت پذیرش"}
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
