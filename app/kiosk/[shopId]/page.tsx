"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PatternLockInput from "@/components/PatternLockInput";
import ComboBox from "@/components/ComboBox";
import { toLatinDigits, normalizePhone, isValidMobile } from "@/lib/phone";
import { COMPUTER_ACCESSORIES, COMPUTER_BRANDS, COMPUTER_DEVICE_TYPES, COMPUTER_OS_OPTIONS } from "@/lib/computer-intake";

export default function KioskPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const [shopName, setShopName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", deviceModel: "", deviceCategory: "MOBILE", imei: "", issueDescription: "",
    deviceType: "", deviceBrand: "", operatingSystem: "", accessories: "",
    devicePasscode: "", devicePasscodeType: "PIN" as string,
  });
  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [serviceCategories, setServiceCategories] = useState<string[]>(["MOBILE"]);
  const [brand, setBrand] = useState("");
  const [collectPasscode, setCollectPasscode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [intakeStatus, setIntakeStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const brandList = Object.keys(catalog);
  const modelsForBrand = brand ? catalog[brand] ?? [] : [];

  useEffect(() => {
    fetch(`/api/kiosk/${shopId}`).then((r) => {
      if (!r.ok) { setNotFound(true); return null; }
      return r.json();
    }).then((d) => { if (d) {
      const categories = (d.serviceCategories ?? ["MOBILE"]).filter((item: string) => item === "MOBILE" || item === "COMPUTER");
      setShopName(d.shopName); setCatalog(d.catalog ?? {}); setServiceCategories(categories.length ? categories : ["MOBILE"]);
      if (categories.length === 1 && categories[0] === "COMPUTER") setForm((current) => ({ ...current, deviceCategory: "COMPUTER", deviceType: "LAPTOP" }));
    } });
  }, [shopId]);

  // After submitting, poll the intake status every 5s so the customer sees
  // the shop's approval live on this same page.
  useEffect(() => {
    if (!submitted || !intakeId || intakeStatus !== "PENDING") return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/kiosk/${shopId}?intake=${intakeId}`);
        if (r.ok) {
          const d = await r.json();
          if (d.intakeStatus && d.intakeStatus !== "PENDING") setIntakeStatus(d.intakeStatus);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, [submitted, intakeId, intakeStatus, shopId]);

  async function submit() {
    setError("");
    if (!form.customerName || !form.customerPhone || !form.deviceModel || !form.issueDescription) {
      setError("لطفاً همه فیلدهای ضروری را پر کنید");
      return;
    }
    if (form.deviceCategory === "COMPUTER" && (!form.deviceType || !form.deviceBrand)) {
      setError("نوع دستگاه و برند کامپیوتر را مشخص کنید");
      return;
    }
    if (!isValidMobile(form.customerPhone)) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد");
      return;
    }
    // The shop texts this number when the repair is ready. See lib/phone.ts.
    const payload = {
      ...form,
      customerPhone: normalizePhone(form.customerPhone),
      devicePasscode: collectPasscode ? form.devicePasscode : "",
    };
    const res = await fetch(`/api/kiosk/${shopId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.message || "ثبت ناموفق بود، لطفاً دوباره تلاش کنید"); return; }
    const data = await res.json().catch(() => null);
    if (data?.intake?.id) setIntakeId(data.intake.id);
    setSubmitted(true);
  }

  function switchDeviceCategory(category: "MOBILE" | "COMPUTER") {
    setBrand("");
    setCollectPasscode(false);
    setForm((current) => ({ ...current, deviceCategory: category, deviceType: category === "COMPUTER" ? "LAPTOP" : "", deviceBrand: "", operatingSystem: "", accessories: "", deviceModel: "", imei: "", devicePasscode: "", devicePasscodeType: "PIN" }));
  }

  function toggleAccessory(key: string) {
    setForm((current) => {
      const selected = current.accessories.split(",").filter(Boolean);
      const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
      return { ...current, accessories: next.join(",") };
    });
  }

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">این مغازه یافت نشد.</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface border border-surface2 rounded-2xl p-6 text-center">
          {intakeStatus === "PENDING" && (
            <>
              <div className="text-3xl mb-3 animate-pulse">⏳</div>
              <p className="text-sm font-bold mb-1">اطلاعات شما ثبت شد</p>
              <p className="text-xs text-muted mb-1">منتظر تأیید نماینده {shopName} بمانید.</p>
              <p className="text-[10px] text-muted">این صفحه خودکار به‌روز می‌شود — لازم نیست کاری کنید.</p>
            </>
          )}
          {intakeStatus === "APPROVED" && (
            <>
              <div className="text-3xl mb-3">✅</div>
              <p className="text-sm font-bold text-teal mb-1">پذیرش شما تأیید شد!</p>
              <p className="text-xs text-muted">دستگاه شما وارد صف تعمیر {shopName} شد. وضعیت تعمیر از طریق پیامک اطلاع‌رسانی می‌شود.</p>
            </>
          )}
          {intakeStatus === "REJECTED" && (
            <>
              <div className="text-3xl mb-3">❌</div>
              <p className="text-sm font-bold text-danger mb-1">پذیرش تأیید نشد</p>
              <p className="text-xs text-muted">لطفاً با نماینده {shopName} صحبت کنید.</p>
            </>
          )}

          <div className="border-t border-surface2 mt-5 pt-4">
            <p className="text-[11px] text-muted mb-2">با حساب مشتری Peyvo می‌توانید سابقه تعمیرهایتان را دنبال کنید و مغازه‌ها را مقایسه کنید:</p>
            <div className="flex gap-2">
              <a href="/customer/login" className="flex-1 bg-copper text-white text-xs font-bold rounded-lg py-2.5">ورود مشتری</a>
              <a href="/customer/signup" className="flex-1 bg-surface2 border border-border text-xs font-bold rounded-lg py-2.5">ثبت‌نام</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className={`kiosk-intake-card w-full bg-surface rounded-2xl p-6 ${form.deviceCategory === "COMPUTER" ? "is-computer" : "is-mobile"}`}>
        <h1 className="display-heading text-lg mb-1">{shopName || "..."}</h1>
        <p className="text-xs text-muted mb-5">{form.deviceCategory === "COMPUTER" ? "پذیرش تخصصی کامپیوتر و تجهیزات رایانه‌ای" : "اطلاعات موبایل خود را برای پذیرش وارد کنید"}</p>

        {serviceCategories.length > 1 && <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => switchDeviceCategory("MOBILE")} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${form.deviceCategory === "MOBILE" ? "border-copper bg-copper text-[#1A1410]" : "border-surface2 bg-surface2 text-muted"}`}>📱 پذیرش موبایل</button>
          <button type="button" onClick={() => switchDeviceCategory("COMPUTER")} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${form.deviceCategory === "COMPUTER" ? "border-teal bg-teal text-[#0B1512]" : "border-surface2 bg-surface2 text-muted"}`}>💻 پذیرش کامپیوتر</button>
        </div>}

        <div className="mb-3">
          <label className="block text-xs text-muted mb-1">نام و نام خانوادگی</label>
          <input
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        </div>

        <div className="mb-3">
          <label className="block text-xs text-muted mb-1">شماره موبایل</label>
          <input
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
            inputMode="tel" dir="ltr" maxLength={11} placeholder="09xxxxxxxxx"
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: toLatinDigits(e.target.value) })} />
        </div>

        {form.deviceCategory === "COMPUTER" ? <div className="computer-kiosk-fields">
          <div className="computer-intake-note"><span aria-hidden="true">💻</span><span><b>مشخصات فنی رایانه</b><small>نوع سیستم و تمام متعلقات تحویلی را دقیق ثبت کنید.</small></span></div>
          <label className="block text-xs text-muted mb-2">نوع دستگاه</label>
          <div className="computer-type-grid mb-4">{COMPUTER_DEVICE_TYPES.map((item) => <button key={item.key} type="button" onClick={() => setForm({ ...form, deviceType: item.key })} className={form.deviceType === item.key ? "is-active" : ""}><b>{item.label}</b><small>{item.hint}</small></button>)}</div>
          <div className="mb-3"><label className="block text-xs text-muted mb-1">برند یا سازنده</label><ComboBox value={brand} onChange={(value) => { setBrand(value); setForm({ ...form, deviceBrand: value, deviceModel: "" }); }} options={COMPUTER_BRANDS} placeholder="مثلاً Lenovo یا اسمبل" /></div>
          <div className="mb-3"><label className="block text-xs text-muted mb-1">مدل یا مشخصات روی بدنه</label><input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" value={form.deviceModel.startsWith(`${brand} `) ? form.deviceModel.slice(brand.length + 1) : form.deviceModel} onChange={(event) => { const model = event.target.value; setForm({ ...form, deviceModel: model ? `${brand ? `${brand} ` : ""}${model}` : "" }); }} placeholder="مثلاً ThinkPad T480 یا Ryzen 5" /></div>
          <div className="grid grid-cols-2 gap-2 mb-3"><div><label className="block text-xs text-muted mb-1">سیستم‌عامل</label><select className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-xs" value={form.operatingSystem} onChange={(event) => setForm({ ...form, operatingSystem: event.target.value })}><option value="">نامشخص</option>{COMPUTER_OS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div><label className="block text-xs text-muted mb-1">شماره سریال</label><input dir="ltr" className="mono w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-xs" value={form.imei} onChange={(event) => setForm({ ...form, imei: event.target.value })} placeholder="Serial" /></div></div>
          <label className="block text-xs text-muted mb-2">لوازم همراه</label><div className="computer-accessory-grid mb-4">{COMPUTER_ACCESSORIES.map((item) => { const active = form.accessories.split(",").includes(item.key); return <button key={item.key} type="button" onClick={() => toggleAccessory(item.key)} className={active ? "is-active" : ""}>{active ? "✓ " : "+ "}{item.label}</button>; })}</div>
        </div> : <>
          <div className="mb-3"><label className="block text-xs text-muted mb-1">برند گوشی</label><ComboBox value={brand} onChange={(value) => { setBrand(value); setForm({ ...form, deviceBrand: value, deviceModel: "" }); }} options={brandList} placeholder="انتخاب یا تایپ برند..." /></div>
          {brand && <div className="mb-3"><label className="block text-xs text-muted mb-1">مدل</label><ComboBox value={form.deviceModel.startsWith(`${brand} `) ? form.deviceModel.slice(brand.length + 1) : form.deviceModel} onChange={(model) => setForm({ ...form, deviceModel: model ? `${brand} ${model}` : "" })} options={modelsForBrand} placeholder="انتخاب یا تایپ مدل..." /></div>}
          <div className="mb-3"><label className="block text-xs text-muted mb-1">IMEI (اختیاری)</label><input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono" inputMode="tel" dir="ltr" value={form.imei} onChange={(event) => setForm({ ...form, imei: event.target.value })} /></div>
        </>}

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">{form.deviceCategory === "COMPUTER" ? "شرح ایراد، پیام خطا یا خدمت درخواستی" : "شرح ایراد"}</label>
          <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted mb-2">
          <input type="checkbox" checked={collectPasscode} onChange={(e) => setCollectPasscode(e.target.checked)} />
          می‌خواهم {form.deviceCategory === "COMPUTER" ? "رمز حساب کاربری سیستم" : "رمز دستگاه"} را برای تست بعد از تعمیر ثبت کنم (اختیاری)
        </label>
        {collectPasscode && (
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              {(form.deviceCategory === "COMPUTER" ? [["PIN", "Windows PIN"], ["PASSWORD", "رمز حساب"]] : [["PIN", "پین عددی"], ["PASSWORD", "رمز/پسورد"], ["PATTERN", "الگو"]]).map(([val, label]) => (
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

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <button onClick={submit} className={`w-full font-bold rounded-lg py-2.5 text-sm ${form.deviceCategory === "COMPUTER" ? "bg-teal text-[#0B1512]" : "bg-copper text-[#1A1410]"}`}>
          ثبت و ارسال به مغازه
        </button>

        <p className="text-[11px] text-muted text-center mt-4 border-t border-surface2 pt-3">
          حساب مشتری دارید؟ <a href="/customer/login" className="text-copper font-bold">ورود</a>
          {" "}· مهمان هستید؟ <a href="/customer/signup" className="text-teal font-bold">ثبت‌نام</a>
        </p>
      </div>
    </div>
  );
}
