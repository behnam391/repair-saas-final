"use client";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatJalaliDate } from "@/lib/jalali";
import ComboBox from "@/components/ComboBox";

const LANE_LABEL: Record<string, string> = { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" };
const PARTNERSHIP_STATUS_LABEL: Record<string, string> = { PENDING: "در انتظار پاسخ", ACCEPTED: "فعال", REJECTED: "رد شده", ENDED: "پایان‌یافته" };
const REFERRAL_STATUS_LABEL: Record<string, string> = { SENT: "ارسال‌شده", ACCEPTED: "پذیرفته‌شده", DECLINED: "رد شده", COMPLETED: "تکمیل‌شده" };

type PartnerShop = { id: string; name: string; address: string | null; province: string | null; type: string; specialties: string | null; verificationLevel: number; partnershipStatus: string | null };
type ShopRef = { id: string; name: string; province: string | null; address: string | null };
type Partnership = {
  id: string; requestedByShopId: string; targetShopId: string; status: string; note?: string | null;
  createdByName: string; createdAt: string; respondedAt?: string | null;
  requestedByShop: ShopRef; targetShop: ShopRef;
};
type Referral = {
  id: string; partnershipId: string; fromShopId: string; toShopId: string;
  customerName: string; customerPhone: string; deviceModel?: string | null; issueNote?: string | null; suggestedLane?: string | null;
  status: string; resultTicketId?: string | null;
  commissionType?: string | null; commissionValue?: number | null; commissionAmount?: number | null; commissionStatus: string; commissionPaidAt?: string | null;
  createdByName: string; createdAt: string;
  fromShop: { id: string; name: string }; toShop: { id: string; name: string };
};

export default function CollaborationPage() {
  const { data: session } = useSession();
  const myShopId = (session?.user as any)?.shopId as string | undefined;

  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState("");
  const [endConfirmId, setEndConfirmId] = useState<string | null>(null);

  async function load() {
    const [pRes, rRes, cRes] = await Promise.all([
      fetch("/api/collaboration/partnerships"), fetch("/api/collaboration/referrals"), fetch("/api/device-catalog"),
    ]);
    if (pRes.ok) setPartnerships((await pRes.json()).partnerships ?? []);
    if (rRes.ok) setReferrals((await rRes.json()).referrals ?? []);
    if (cRes.ok) setCatalog((await cRes.json()).catalog ?? {});
  }
  useEffect(() => { load(); }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (!myShopId) return <p className="p-4 text-sm text-muted">در حال بارگذاری...</p>;

  const accepted = partnerships.filter((p) => p.status === "ACCEPTED");
  const incomingPending = partnerships.filter((p) => p.status === "PENDING" && p.targetShopId === myShopId);
  const outgoingPending = partnerships.filter((p) => p.status === "PENDING" && p.requestedByShopId === myShopId);
  const otherLinks = partnerships.filter((p) => p.status === "REJECTED" || p.status === "ENDED");

  const acceptedPartners = accepted.map((p) => ({
    partnershipId: p.id,
    shop: p.requestedByShopId === myShopId ? p.targetShop : p.requestedByShop,
  }));

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">همکاری بین مغازه‌ها</h1>
      <p className="text-xs text-muted mb-4">با مغازه‌های دیگر (در تخصص‌های مختلف) همکاری کنید، مشتری ارجاع بدهید و برایش پورسانت رد و بدل کنید.</p>

      <Section title="شرکای همکاری" icon="🤝" defaultOpen>
        <PartnerSearch myShopId={myShopId} onSent={() => { load(); flash("درخواست همکاری ارسال شد"); }} />

        {incomingPending.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-amber mb-2">درخواست‌های دریافتی</div>
            <div className="space-y-2">
              {incomingPending.map((p) => (
                <div key={p.id} className="bg-amber/10 border border-amber/40 rounded-lg p-3 text-xs">
                  <div className="font-bold">{p.requestedByShop.name}</div>
                  <div className="text-muted mt-0.5">{p.requestedByShop.province ?? ""} {p.requestedByShop.address ? "· " + p.requestedByShop.address : ""}</div>
                  {p.note && <div className="text-[11px] mt-1.5">«{p.note}»</div>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={async () => { await fetch(`/api/collaboration/partnerships/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) }); load(); flash("همکاری پذیرفته شد"); }}
                      className="flex-1 bg-teal text-white text-xs font-bold rounded-lg py-1.5">پذیرفتن</button>
                    <button onClick={async () => { await fetch(`/api/collaboration/partnerships/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) }); load(); }}
                      className="flex-1 bg-surface border border-surface2 text-xs font-semibold rounded-lg py-1.5">رد کردن</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {outgoingPending.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-muted mb-2">درخواست‌های ارسالی (در انتظار پاسخ)</div>
            <div className="space-y-1.5">
              {outgoingPending.map((p) => (
                <div key={p.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs flex justify-between">
                  <span>{p.targetShop.name}</span>
                  <span className="text-muted">{PARTNERSHIP_STATUS_LABEL[p.status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] font-bold mb-2">همکاران فعال</div>
        {accepted.length === 0 ? (
          <p className="text-xs text-muted">هنوز همکار فعالی ندارید.</p>
        ) : (
          <div className="space-y-1.5">
            {acceptedPartners.map(({ partnershipId, shop }) => (
              <div key={partnershipId} className="bg-surface2 border border-teal/40 rounded-lg px-3 py-2 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{shop.name}</div>
                    <div className="text-muted text-[10px] mt-0.5">{shop.province ?? ""}</div>
                  </div>
                  {endConfirmId !== partnershipId ? (
                    <button onClick={() => setEndConfirmId(partnershipId)} className="text-danger text-[10px] font-semibold shrink-0">پایان همکاری</button>
                  ) : (
                    <span className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          await fetch(`/api/collaboration/partnerships/${partnershipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }) });
                          setEndConfirmId(null);
                          load();
                        }}
                        className="text-danger text-[10px] font-bold">مطمئنید؟ ✕</button>
                      <button onClick={() => setEndConfirmId(null)} className="text-muted text-[10px]">انصراف</button>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {otherLinks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface2">
            <div className="text-[10px] text-muted mb-1.5">سابقه (رد‌شده / پایان‌یافته)</div>
            <div className="space-y-1">
              {otherLinks.map((p) => (
                <div key={p.id} className="text-[10px] text-muted flex justify-between">
                  <span>{p.requestedByShopId === myShopId ? p.targetShop.name : p.requestedByShop.name}</span>
                  <span>{PARTNERSHIP_STATUS_LABEL[p.status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="ارجاع مشتری به همکار" icon="📤">
        {acceptedPartners.length === 0 ? (
          <p className="text-xs text-muted">برای ارجاع مشتری، ابتدا باید حداقل یک همکاری فعال داشته باشید.</p>
        ) : (
          <ReferralForm partners={acceptedPartners} catalog={catalog} onSent={() => { load(); flash("ارجاع ثبت و برای مغازه همکار ارسال شد"); }} />
        )}
      </Section>

      <Section title="ارجاعات ارسالی" icon="📨">
        <ReferralList
          referrals={referrals.filter((r) => r.fromShopId === myShopId)}
          myShopId={myShopId}
          onChanged={load}
          onMsg={flash}
        />
      </Section>

      <Section title="ارجاعات دریافتی" icon="📥" defaultOpen>
        <ReferralList
          referrals={referrals.filter((r) => r.toShopId === myShopId)}
          myShopId={myShopId}
          onChanged={load}
          onMsg={flash}
        />
      </Section>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#1B302D] border border-teal text-teal text-xs px-4 py-2.5 rounded-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

/* Same collapsible-card pattern as the admin panel. */
function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface border border-surface2 rounded-xl mb-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex justify-between items-center px-4 py-3 text-right">
        <span className="text-sm font-bold">{icon} {title}</span>
        <span className={`text-muted text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function PartnerSearch({ myShopId, onSent }: { myShopId: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<PartnerShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function search() {
    setLoading(true);
    const res = await fetch(`/api/collaboration/shops?q=${encodeURIComponent(q)}`);
    if (res.ok) setResults((await res.json()).shops ?? []);
    setLoading(false);
  }

  async function sendRequest(targetShopId: string) {
    setErr("");
    setSendingTo(targetShopId);
    const res = await fetch("/api/collaboration/partnerships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetShopId, note: note || undefined }),
    });
    setSendingTo(null);
    if (res.ok) { setOpen(false); setQ(""); setNote(""); setResults([]); onSent(); }
    else { const d = await res.json().catch(() => ({})); setErr(d.message || "ارسال درخواست ناموفق بود"); }
  }

  return (
    <div className="mb-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
          + افزودن همکار جدید
        </button>
      ) : (
        <div className="bg-surface2 border border-border rounded-xl p-3 space-y-2">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="نام مغازه را جستجو کنید..." className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-2 text-sm" />
            <button onClick={search} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3 shrink-0">{loading ? "..." : "جستجو"}</button>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت همراه درخواست (اختیاری)"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs" />
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {results.map((s) => (
              <div key={s.id} className="bg-surface border border-surface2 rounded-lg px-3 py-2 flex justify-between items-center">
                <div className="text-xs">
                  <div className="font-bold">{s.name}</div>
                  <div className="text-muted text-[10px] mt-0.5">{s.province ?? ""} {s.address ? "· " + s.address : ""}</div>
                </div>
                {s.partnershipStatus ? (
                  <span className="text-[10px] text-muted shrink-0">{PARTNERSHIP_STATUS_LABEL[s.partnershipStatus] ?? s.partnershipStatus}</span>
                ) : (
                  <button onClick={() => sendRequest(s.id)} disabled={sendingTo === s.id}
                    className="bg-teal text-white text-[10px] font-bold rounded-lg px-2.5 py-1.5 shrink-0 disabled:opacity-50">
                    {sendingTo === s.id ? "..." : "ارسال درخواست"}
                  </button>
                )}
              </div>
            ))}
            {results.length === 0 && !loading && <p className="text-[11px] text-muted text-center py-2">برای دیدن مغازه‌ها جستجو کنید.</p>}
          </div>
          {err && <p className="text-danger text-[11px]">{err}</p>}
          <button onClick={() => setOpen(false)} className="w-full bg-surface border border-surface2 text-xs font-semibold rounded-lg py-1.5">بستن</button>
        </div>
      )}
    </div>
  );
}

function ReferralForm({
  partners, catalog, onSent,
}: {
  partners: { partnershipId: string; shop: ShopRef }[];
  catalog: Record<string, string[]>;
  onSent: () => void;
}) {
  const [partnershipId, setPartnershipId] = useState(partners[0]?.partnershipId ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [suggestedLane, setSuggestedLane] = useState("");
  const [commissionType, setCommissionType] = useState<"" | "PERCENT" | "FLAT">("");
  const [commissionValue, setCommissionValue] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const brandList = Object.keys(catalog);
  const modelsForBrand = brand ? catalog[brand] ?? [] : [];

  async function submit() {
    setError("");
    if (!partnershipId) { setError("یک همکار انتخاب کنید"); return; }
    if (!customerName.trim() || !customerPhone.trim()) { setError("نام و شماره مشتری را وارد کنید"); return; }
    if (!/^09\d{9}$/.test(customerPhone.trim())) { setError("شماره موبایل باید ۱۱ رقمی و با ۰۹ باشد"); return; }
    setBusy(true);
    const res = await fetch("/api/collaboration/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnershipId, customerName: customerName.trim(), customerPhone: customerPhone.trim(),
        deviceModel: brand ? `${brand}${model ? " " + model : ""}` : undefined,
        issueNote: issueNote || undefined,
        suggestedLane: suggestedLane || undefined,
        commissionType: commissionType || undefined,
        commissionValue: commissionType ? commissionValue : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || "ثبت ارجاع ناموفق بود"); return; }
    setCustomerName(""); setCustomerPhone(""); setBrand(""); setModel(""); setIssueNote(""); setSuggestedLane(""); setCommissionType(""); setCommissionValue(0);
    onSent();
  }

  return (
    <div className="space-y-2.5">
      <label className="block text-xs text-muted mb-1">ارجاع به کدام همکار</label>
      <select className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" value={partnershipId} onChange={(e) => setPartnershipId(e.target.value)}>
        {partners.map((p) => <option key={p.partnershipId} value={p.partnershipId}>{p.shop.name}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-muted mb-1">نام مشتری</label>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">شماره تماس</label>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono" dir="ltr" inputMode="tel" maxLength={11}
            placeholder="09xxxxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
      </div>

      <label className="block text-xs text-muted mb-1">برند دستگاه (اختیاری)</label>
      <ComboBox value={brand} onChange={(v) => { setBrand(v); setModel(""); }} options={brandList} placeholder="انتخاب یا تایپ برند..." />
      {brand && (
        <ComboBox value={model} onChange={setModel} options={modelsForBrand} placeholder="انتخاب یا تایپ مدل..." />
      )}

      <label className="block text-xs text-muted mb-1">شرح ایراد / یادداشت (اختیاری)</label>
      <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" value={issueNote} onChange={(e) => setIssueNote(e.target.value)} />

      <label className="block text-xs text-muted mb-1">پیشنهاد ارجاع به کدام تخصص (اختیاری)</label>
      <select className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" value={suggestedLane} onChange={(e) => setSuggestedLane(e.target.value)}>
        <option value="">بدون پیشنهاد</option>
        {Object.entries(LANE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>

      <div className="bg-surface2/60 border border-border rounded-lg p-3">
        <div className="text-[11px] font-bold mb-2">پیشنهاد پورسانت (اختیاری — فقط توافق اولیه، مبلغ نهایی هنگام تکمیل کار ثبت می‌شود)</div>
        <div className="flex gap-2 mb-2">
          {(["", "PERCENT", "FLAT"] as const).map((t) => (
            <button key={t || "none"} type="button" onClick={() => setCommissionType(t)}
              className={`flex-1 text-[11px] rounded-lg py-1.5 border transition ${commissionType === t ? "bg-copper text-[#1A1410] border-copper" : "bg-surface border-surface2 text-muted"}`}>
              {t === "" ? "بدون پیشنهاد" : t === "PERCENT" ? "درصدی" : "مبلغ ثابت"}
            </button>
          ))}
        </div>
        {commissionType && (
          <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs"
            placeholder={commissionType === "PERCENT" ? "درصد، مثلاً 10" : "مبلغ به تومان"}
            value={commissionValue || ""} onChange={(e) => setCommissionValue(num(e.target.value))} />
        )}
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
      <button onClick={submit} disabled={busy} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-60">
        {busy ? "در حال ثبت..." : "ثبت و ارسال ارجاع"}
      </button>
    </div>
  );
}

function ReferralList({
  referrals, myShopId, onChanged, onMsg,
}: {
  referrals: Referral[];
  myShopId: string;
  onChanged: () => void;
  onMsg: (m: string) => void;
}) {
  if (referrals.length === 0) return <p className="text-xs text-muted">موردی ثبت نشده.</p>;

  return (
    <div className="space-y-2.5">
      {referrals.map((r) => <ReferralRow key={r.id} r={r} myShopId={myShopId} onChanged={onChanged} onMsg={onMsg} />)}
    </div>
  );
}

function ReferralRow({ r, myShopId, onChanged, onMsg }: { r: Referral; myShopId: string; onChanged: () => void; onMsg: (m: string) => void }) {
  const isSent = r.fromShopId === myShopId;
  const [completing, setCompleting] = useState(false);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  async function act(action: string, extra?: Record<string, any>) {
    setBusy(true);
    const res = await fetch(`/api/collaboration/referrals/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); onMsg(d.message || "خطایی رخ داد"); return; }
    setCompleting(false);
    onChanged();
  }

  const commissionHint = r.commissionType
    ? r.commissionType === "PERCENT" ? `پیشنهاد: ${r.commissionValue}٪` : `پیشنهاد: ${r.commissionValue?.toLocaleString("fa-IR")} تومان`
    : null;

  return (
    <div className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
      <div className="flex justify-between">
        <span className="font-bold">{r.customerName} · {r.customerPhone}</span>
        <span className="text-muted">{REFERRAL_STATUS_LABEL[r.status] ?? r.status}</span>
      </div>
      <div className="text-muted mt-1">
        {isSent ? `به: ${r.toShop.name}` : `از: ${r.fromShop.name}`}
        {r.deviceModel && ` · ${r.deviceModel}`}
      </div>
      {r.issueNote && <div className="text-[#C7CAD1] mt-1">{r.issueNote}</div>}
      <div className="text-[10px] text-muted mt-1">{formatJalaliDate(r.createdAt)} · ثبت توسط {r.createdByName}</div>

      {commissionHint && r.status !== "COMPLETED" && <div className="text-[10px] text-amber mt-1.5">{commissionHint}</div>}

      {/* Receiving shop, still SENT: accept/decline */}
      {!isSent && r.status === "SENT" && (
        <div className="flex gap-2 mt-2.5">
          <button onClick={() => act("accept")} disabled={busy} className="flex-1 bg-teal text-white text-[11px] font-bold rounded-lg py-1.5 disabled:opacity-50">پذیرفتن و ثبت تیکت</button>
          <button onClick={() => act("decline")} disabled={busy} className="flex-1 bg-surface border border-surface2 text-[11px] font-semibold rounded-lg py-1.5 disabled:opacity-50">رد کردن</button>
        </div>
      )}

      {/* Receiving shop, ACCEPTED but not yet COMPLETED: mark complete + commission */}
      {!isSent && r.status === "ACCEPTED" && !completing && (
        <button onClick={() => { setCompleting(true); setAmount(r.commissionType === "FLAT" ? (r.commissionValue ?? 0) : 0); }}
          className="w-full mt-2.5 bg-copper text-[#1A1410] text-[11px] font-bold rounded-lg py-1.5">
          تکمیل کار و ثبت پورسانت
        </button>
      )}
      {!isSent && r.status === "ACCEPTED" && completing && (
        <div className="mt-2.5 bg-surface border border-border rounded-lg p-2.5 space-y-2">
          <label className="block text-[10px] text-muted">مبلغ نهایی پورسانت (تومان) — {commissionHint ?? "بدون پیشنهاد قبلی"}</label>
          <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
            value={amount || ""} onChange={(e) => setAmount(num(e.target.value))} />
          <div className="flex gap-2">
            <button onClick={() => act("complete", { commissionAmount: amount })} disabled={busy} className="flex-1 bg-teal text-white text-[11px] font-bold rounded-lg py-1.5 disabled:opacity-50">ثبت</button>
            <button onClick={() => setCompleting(false)} className="flex-1 bg-surface2 text-[11px] rounded-lg py-1.5">انصراف</button>
          </div>
        </div>
      )}

      {/* Commission settlement — visible to both sides once completed */}
      {r.status === "COMPLETED" && (
        <div className="mt-2.5 bg-surface border border-border rounded-lg p-2.5 flex justify-between items-center">
          <div>
            <div className="text-[11px] font-bold">{(r.commissionAmount ?? 0).toLocaleString("fa-IR")} تومان</div>
            <div className="text-[10px] text-muted">{isSent ? "شما طلبکار این مبلغ هستید" : "شما بدهکار این مبلغ هستید"}</div>
          </div>
          {r.commissionStatus === "PAID" ? (
            <span className="text-teal text-[11px] font-bold">✅ تسویه شد</span>
          ) : r.commissionStatus === "PENDING" ? (
            <button onClick={() => act("mark-paid")} disabled={busy} className="bg-teal text-white text-[10px] font-bold rounded-lg px-3 py-1.5 disabled:opacity-50">ثبت پرداخت‌شده</button>
          ) : (
            <span className="text-muted text-[11px]">بدون پورسانت</span>
          )}
        </div>
      )}
    </div>
  );
}
