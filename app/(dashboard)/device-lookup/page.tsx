"use client";
import { num } from "@/lib/num";
import { useState } from "react";
import { formatJalaliDate } from "@/lib/jalali";

const FLAG_LABEL: Record<string, string> = { STOLEN: "گزارش مسروقه", INSTALLMENT_DEBT: "بدهی قسط پرداخت‌نشده", OTHER: "سایر" };

type Ticket = {
  id: string; no: number; deviceModel: string; issueInitial: string; status: string; createdAt: string;
  shop: { name: string }; history: { action: string; createdAt: string }[];
};
type Flag = { id: string; flagType: string; note: string; createdAt: string; shop: { name: string }; reporter: { name: string } };
type Tx = { id: string; sellerName: string; buyerName: string; price: number | null; note: string | null; createdAt: string; shop: { name: string } };

export default function DeviceLookupPage() {
  const [imei, setImei] = useState("");
  const [searched, setSearched] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);

  async function search() {
    if (imei.trim().length < 6) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/devices/${encodeURIComponent(imei.trim())}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setFlags(data.flags ?? []);
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">پرونده گوشی (جستجو با IMEI)</h1>
      <p className="text-[11px] text-muted mb-4">
        تاریخچه تعمیر، گزارش‌های احتمالی و زنجیره خرید و فروش این دستگاه را در سراسر کشور ببینید.
      </p>

      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
          placeholder="شماره IMEI را وارد کنید"
          value={imei}
          onChange={(e) => setImei(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button onClick={search} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4">جستجو</button>
      </div>

      {searched && (
        <>
          {loading ? (
            <p className="text-muted text-sm text-center py-8">در حال جستجو...</p>
          ) : (
            <div className="space-y-5 mt-4">
              {/* Flags first — safety-relevant, should be most visible */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">گزارش‌های هشدار</span>
                  <button onClick={() => setShowFlagForm((v) => !v)} className="text-[11px] text-danger font-semibold">+ ثبت گزارش</button>
                </div>
                <p className="text-[10px] text-muted mb-2">
                  ⚠️ این گزارش‌ها توسط تعمیرکاران و فروشندگان دیگر ثبت شده و یک استعلام رسمی/قانونی نیست.
                </p>
                {flags.length === 0 ? (
                  <p className="text-xs text-muted">گزارشی ثبت نشده.</p>
                ) : (
                  <div className="space-y-2">
                    {flags.map((f) => (
                      <div key={f.id} className="bg-danger/10 border border-danger/40 rounded-lg p-2.5 text-xs">
                        <div className="font-bold text-danger">{FLAG_LABEL[f.flagType]}</div>
                        <div className="mt-1">{f.note}</div>
                        <div className="text-[10px] text-muted mt-1">{f.reporter.name} ({f.shop.name}) · {formatJalaliDate(f.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {showFlagForm && <FlagForm imei={imei} onDone={() => { setShowFlagForm(false); search(); }} />}
              </div>

              {/* Ownership chain */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">زنجیره خرید و فروش</span>
                  <button onClick={() => setShowTxForm((v) => !v)} className="text-[11px] text-copper font-semibold">+ ثبت معامله</button>
                </div>
                {transactions.length === 0 ? (
                  <p className="text-xs text-muted">معامله‌ای ثبت نشده.</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => (
                      <div key={t.id} className="bg-surface2 border border-surface2 rounded-lg p-2.5 text-xs">
                        <div>{t.sellerName} → {t.buyerName}</div>
                        {t.price && <div className="mono text-muted mt-0.5">{t.price.toLocaleString("fa-IR")} تومان</div>}
                        {t.note && <div className="mt-1 text-[#C7CAD1]">{t.note}</div>}
                        <div className="text-[10px] text-muted mt-1">ثبت توسط {t.shop.name} · {formatJalaliDate(t.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {showTxForm && <TxForm imei={imei} onDone={() => { setShowTxForm(false); search(); }} />}
              </div>

              {/* Repair history */}
              <div>
                <span className="text-sm font-bold">تاریخچه تعمیر</span>
                {tickets.length === 0 ? (
                  <p className="text-xs text-muted mt-2">این IMEI هیچ سابقه تعمیری در سیستم ندارد.</p>
                ) : (
                  <div className="space-y-3 mt-2">
                    {tickets.map((t) => (
                      <div key={t.id} className="bg-surface border border-surface2 rounded-xl p-3">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">{t.deviceModel} #{t.no}</span>
                          <span className="text-muted">{t.shop.name}</span>
                        </div>
                        <div className="text-[11px] text-muted mt-1">{t.issueInitial}</div>
                        <div className="text-[10px] text-muted mt-1">{formatJalaliDate(t.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FlagForm({ imei, onDone }: { imei: string; onDone: () => void }) {
  const [flagType, setFlagType] = useState("STOLEN");
  const [note, setNote] = useState("");

  async function submit() {
    if (note.trim().length < 3) return;
    await fetch(`/api/devices/${encodeURIComponent(imei)}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagType, note }),
    });
    onDone();
  }

  return (
    <div className="bg-surface2 border border-surface2 rounded-lg p-3 mt-2">
      <select className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs mb-2"
        value={flagType} onChange={(e) => setFlagType(e.target.value)}>
        <option value="STOLEN">گزارش مسروقه</option>
        <option value="INSTALLMENT_DEBT">بدهی قسط پرداخت‌نشده</option>
        <option value="OTHER">سایر</option>
      </select>
      <textarea className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs mb-2"
        placeholder="توضیح دهید چرا این گزارش را ثبت می‌کنید..."
        value={note} onChange={(e) => setNote(e.target.value)} />
      <button onClick={submit} className="w-full bg-danger text-white text-xs font-bold rounded-lg py-2">ثبت گزارش</button>
    </div>
  );
}

function TxForm({ imei, onDone }: { imei: string; onDone: () => void }) {
  const [form, setForm] = useState({ deviceModel: "", sellerName: "", sellerPhone: "", buyerName: "", buyerPhone: "", price: 0, note: "" });

  async function submit() {
    if (!form.deviceModel || !form.sellerName || !form.buyerName) return;
    await fetch(`/api/devices/${encodeURIComponent(imei)}/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onDone();
  }

  return (
    <div className="bg-surface2 border border-surface2 rounded-lg p-3 mt-2 space-y-2">
      <input className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="مدل دستگاه"
        value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} />
      <input className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="نام فروشنده"
        value={form.sellerName} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} />
      <input className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="نام خریدار"
        value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
      <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="مبلغ (تومان)"
        value={form.price} onChange={(e) => setForm({ ...form, price: num(e.target.value) })} />
      <textarea className="w-full bg-surface border border-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="توضیحات (اختیاری)"
        value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <button onClick={submit} className="w-full bg-copper text-[#1A1410] text-xs font-bold rounded-lg py-2">ثبت معامله</button>
    </div>
  );
}
