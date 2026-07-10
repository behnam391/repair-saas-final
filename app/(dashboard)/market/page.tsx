"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const CATEGORY_LABEL: Record<string, string> = {
  BOARD: "برد / شماتیک", FLASH_FILE: "فایل فلش", PART: "قطعه", EXPERTISE: "مشاوره تخصصی", OTHER: "سایر",
};

type Listing = {
  id: string; category: string; title: string; description: string; deviceModel?: string;
  province: string; city: string; status: string; createdAt: string;
  author: { name: string; phone: string }; authorId: string; shop: { name: string };
  replies: { id: string; message: string; author: { name: string; phone: string }; createdAt: string }[];
};

export default function MarketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [listings, setListings] = useState<Listing[]>([]);
  const [provinces, setProvinces] = useState<Record<string, string[]>>({});
  const [filterProvince, setFilterProvince] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadLocations() {
    const mod = await import("@/lib/iran-locations");
    setProvinces(mod.IRAN_PROVINCES);
  }

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterProvince) qs.set("province", filterProvince);
    if (filterCategory) qs.set("category", filterCategory);
    const res = await fetch(`/api/market?${qs.toString()}`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setLoading(false);
  }

  useEffect(() => { loadLocations(); }, []);
  useEffect(() => { load(); }, [filterProvince, filterCategory]);

  async function startChat(listingId: string) {
    const res = await fetch(`/api/market/${listingId}/conversations`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/chats?open=${data.conversation.id}`);
    }
  }

  async function sendReply(id: string) {
    const message = replyDraft[id]?.trim();
    if (!message) return;
    await fetch(`/api/market/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setReplyDraft({ ...replyDraft, [id]: "" });
    load();
  }

  async function resolve(id: string) {
    await fetch(`/api/market/${id}/reply`, { method: "PATCH" });
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-1">
        <h1 className="display-heading text-lg">بازار سراسری تعمیرکاران</h1>
        <button onClick={() => setShowNew(true)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3 py-2">
          + ثبت درخواست
        </button>
      </div>
      <p className="text-[11px] text-muted mb-4">دنبال یک برد، فایل فلش، قطعه یا مشاوره تخصصی هستید؟ اینجا از تعمیرکاران سراسر ایران کمک بگیرید.</p>

      <div className="flex gap-2 mb-4">
        <select className="flex-1 bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
          value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}>
          <option value="">همه استان‌ها</option>
          {Object.keys(provinces).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="flex-1 bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
          value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">همه دسته‌ها</option>
          {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">در حال بارگذاری...</p>
      ) : listings.length === 0 ? (
        <p className="text-muted text-xs text-center py-8 border border-dashed border-surface2 rounded-lg">
          موردی با این فیلتر پیدا نشد.
        </p>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-surface border border-surface2 rounded-xl p-3.5">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] bg-copper/20 text-copper rounded-full px-2 py-0.5 font-semibold">
                    {CATEGORY_LABEL[l.category]}
                  </span>
                  <div className="font-bold text-sm mt-1.5">{l.title}</div>
                </div>
                {l.status === "RESOLVED" && (
                  <span className="text-[10px] bg-teal/20 text-teal rounded-full px-2 py-0.5 font-semibold shrink-0">برطرف شد</span>
                )}
              </div>
              <div className="text-xs text-[#C7CAD1] mt-1.5">{l.description}</div>
              {l.deviceModel && <div className="text-[11px] text-muted mt-1">مدل: {l.deviceModel}</div>}
              <div className="text-[11px] text-muted mt-2">
                {l.author.name} ({l.shop.name}) · {l.city}، {l.province} · {new Date(l.createdAt).toLocaleDateString("fa-IR")}
              </div>
              <a href={`tel:${l.author.phone}`} className="inline-block text-[11px] text-copper font-semibold mt-1.5">
                📞 تماس: {l.author.phone}
              </a>
              {myId !== l.authorId && (
                <button onClick={() => startChat(l.id)} className="inline-block text-[11px] text-teal font-semibold mt-1.5 mr-3">
                  💬 ارسال پیام
                </button>
              )}

              {l.replies.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-surface2 pt-2.5">
                  {l.replies.map((r) => (
                    <div key={r.id} className="text-xs bg-surface2 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold">{r.author.name}:</span> {r.message}
                    </div>
                  ))}
                </div>
              )}

              {l.status === "OPEN" && (
                <div className="flex gap-2 mt-2.5">
                  <input
                    placeholder="پاسخ بده..."
                    className="flex-1 bg-surface2 border border-surface2 rounded-lg px-2 py-1.5 text-xs"
                    value={replyDraft[l.id] || ""}
                    onChange={(e) => setReplyDraft({ ...replyDraft, [l.id]: e.target.value })}
                  />
                  <button onClick={() => sendReply(l.id)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3">
                    ارسال
                  </button>
                  <button onClick={() => resolve(l.id)} className="bg-surface2 border border-surface2 text-xs rounded-lg px-2.5 text-muted">
                    برطرف شد
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewListingModal
          provinces={provinces}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function NewListingModal({
  provinces, onClose, onCreated,
}: { provinces: Record<string, string[]>; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    category: "PART", title: "", description: "", deviceModel: "",
    province: "تهران", city: "تهران",
  });
  const [error, setError] = useState("");
  const cities = provinces[form.province] || [];

  async function submit() {
    setError("");
    const res = await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "ثبت درخواست ناموفق بود");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="font-extrabold text-base mb-1">ثبت درخواست در بازار سراسری</div>
        <div className="text-xs text-muted mb-4">این پست برای همه تعمیرکاران سراسر ایران قابل مشاهده است.</div>

        <label className="block text-xs text-muted mb-1">دسته</label>
        <select className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>

        <label className="block text-xs text-muted mb-1">عنوان</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="مثلاً: دنبال برد A54 سالم"
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label className="block text-xs text-muted mb-1">توضیحات</label>
        <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <label className="block text-xs text-muted mb-1">مدل دستگاه (اختیاری)</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} />

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">استان</label>
            <select className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value, city: (provinces[e.target.value] || [])[0] || "" })}>
              {Object.keys(provinces).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">شهر</label>
            <select className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm"
              value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-danger text-xs mb-3">{error}</p>}
        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
          ثبت درخواست
        </button>
      </div>
    </div>
  );
}
