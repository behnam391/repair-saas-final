"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function KioskPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const [shopName, setShopName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", deviceModel: "", imei: "", issueDescription: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/kiosk/${shopId}`).then((r) => {
      if (!r.ok) { setNotFound(true); return null; }
      return r.json();
    }).then((d) => d && setShopName(d.shopName));
  }, [shopId]);

  async function submit() {
    setError("");
    if (!form.customerName || !form.customerPhone || !form.deviceModel || !form.issueDescription) {
      setError("لطفاً همه فیلدهای ضروری را پر کنید");
      return;
    }
    const res = await fetch(`/api/kiosk/${shopId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setError("ثبت ناموفق بود، لطفاً دوباره تلاش کنید"); return; }
    setSubmitted(true);
  }

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">این مغازه یافت نشد.</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-3xl mb-3">✅</div>
          <p className="text-sm font-bold mb-1">اطلاعات شما ثبت شد</p>
          <p className="text-xs text-muted">منتظر تأیید نماینده {shopName} بمانید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6">
        <h1 className="display-heading text-lg mb-1">{shopName || "..."}</h1>
        <p className="text-xs text-muted mb-5">اطلاعات دستگاه خود را برای پذیرش وارد کنید</p>

        {[
          ["نام و نام خانوادگی", "customerName"],
          ["شماره موبایل", "customerPhone"],
          ["مدل دستگاه", "deviceModel"],
          ["IMEI (اختیاری)", "imei"],
        ].map(([label, key]) => (
          <div key={key} className="mb-3">
            <label className="block text-xs text-muted mb-1">{label}</label>
            <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
              value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">شرح ایراد</label>
          <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} />
        </div>

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">
          ثبت و ارسال به مغازه
        </button>
      </div>
    </div>
  );
}
