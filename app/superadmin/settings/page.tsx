"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FONT_OPTIONS } from "@/lib/fonts";

// Settings are grouped into internal tabs so each concern has a clear home
// (theme is no longer buried next to API keys). It's still ONE form and one
// save — tabs only filter what's shown; switching tabs never loses edits.
const TABS: [string, string][] = [
  ["appearance", "🎨 ظاهر"],
  ["subs", "💳 اشتراک"],
  ["sms", "📩 پیامک"],
  ["payment", "🏦 پرداخت"],
  ["email", "✉️ ایمیل"],
  ["trust", "🛡️ اعتماد"],
  ["ai", "🤖 هوش مصنوعی"],
  ["other", "⚙️ سایر"],
];

export default function SuperAdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("appearance");
  const [form, setForm] = useState({
    kavenegarApiKey: "", kavenegarSender: "", zarinpalMerchantId: "",
    smsUseLookup: false, kavenegarOtpTemplate: "", kavenegarIntakeTemplate: "", kavenegarReadyTemplate: "",
    paymentProvider: "zarinpal", zibalMerchant: "", nextpayApiKey: "",
    guideUrl: "", aboutUsContent: "",
    smtpHost: "", smtpPort: 587, smtpUser: "", smtpPassword: "", smtpFromAddress: "",
    neshanApiKey: "", enamadId: "", enamadCode: "",
    androidApkUrl: "", bazaarUrl: "", myketUrl: "",
    bazaarRsaPublicKey: "", bazaarDynamicDiscountKey: "",
    myketRsaPublicKey: "", myketAccessToken: "",
    fontFamily: "vazirmatn", defaultTheme: "dark",
    proPriceToman: 490000, businessPriceToman: 990000,
    proQuota: 200, businessQuota: 100000,
    discount3: 5, discount6: 10, discount12: 20,
    aiEnabled: false, aiProvider: "disabled", aiBaseUrl: "", aiApiKey: "", aiModel: "",
    aiFallbackProvider: "", aiFallbackBaseUrl: "", aiFallbackApiKey: "", aiFallbackModel: "",
    aiTimeoutMs: 20000, aiMaxRetries: 2, aiShopDailyLimit: 200,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [aiSecretSet, setAiSecretSet] = useState<{ apiKey: boolean; fallbackApiKey: boolean }>({ apiKey: false, fallbackApiKey: false });
  const [myketSecretSet, setMyketSecretSet] = useState<{ publicKey: boolean; accessToken: boolean }>({ publicKey: false, accessToken: false });
  const [aiTest, setAiTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [aiTesting, setAiTesting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  // Load every font's stylesheet so the pickers below preview in the real
  // typeface (only the active font + Vazirmatn are loaded by the layout).
  useEffect(() => {
    FONT_OPTIONS.forEach((f) => {
      if (!f.url || document.querySelector(`link[data-font="${f.key}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = f.url;
      l.setAttribute("data-font", f.key);
      document.head.appendChild(l);
    });
  }, []);

  useEffect(() => {
    fetch("/api/superadmin/settings").then((r) => r.json()).then((d) => { setForm({
      kavenegarApiKey: d.settings?.kavenegarApiKey ?? "",
      kavenegarSender: d.settings?.kavenegarSender ?? "",
      smsUseLookup: d.settings?.smsUseLookup ?? false,
      kavenegarOtpTemplate: d.settings?.kavenegarOtpTemplate ?? "",
      kavenegarIntakeTemplate: d.settings?.kavenegarIntakeTemplate ?? "",
      kavenegarReadyTemplate: d.settings?.kavenegarReadyTemplate ?? "",
      zarinpalMerchantId: d.settings?.zarinpalMerchantId ?? "",
      paymentProvider: d.settings?.paymentProvider ?? "zarinpal",
      zibalMerchant: d.settings?.zibalMerchant ?? "",
      nextpayApiKey: d.settings?.nextpayApiKey ?? "",
      guideUrl: d.settings?.guideUrl ?? "",
      aboutUsContent: d.settings?.aboutUsContent ?? "",
      smtpHost: d.settings?.smtpHost ?? "", smtpPort: d.settings?.smtpPort ?? 587,
      smtpUser: d.settings?.smtpUser ?? "", smtpPassword: d.settings?.smtpPassword ?? "",
      smtpFromAddress: d.settings?.smtpFromAddress ?? "",
      neshanApiKey: d.settings?.neshanApiKey ?? "",
      enamadId: d.settings?.enamadId ?? "",
      enamadCode: d.settings?.enamadCode ?? "",
      androidApkUrl: d.settings?.androidApkUrl ?? "",
      bazaarUrl: d.settings?.bazaarUrl ?? "",
      myketUrl: d.settings?.myketUrl ?? "",
      bazaarRsaPublicKey: d.settings?.bazaarRsaPublicKey ?? "",
      bazaarDynamicDiscountKey: d.settings?.bazaarDynamicDiscountKey ?? "",
      myketRsaPublicKey: "",
      myketAccessToken: "",
      fontFamily: d.settings?.fontFamily ?? "vazirmatn",
      defaultTheme: d.settings?.defaultTheme ?? "dark",
      // effective = stored value, or the code default when never set
      proPriceToman: d.settings?.proPriceToman ?? 490000,
      businessPriceToman: d.settings?.businessPriceToman ?? 990000,
      proQuota: d.settings?.proQuota ?? 200,
      businessQuota: d.settings?.businessQuota ?? 100000,
      discount3: d.settings?.discount3 ?? 5,
      discount6: d.settings?.discount6 ?? 10,
      discount12: d.settings?.discount12 ?? 20,
      aiEnabled: d.settings?.aiEnabled ?? false,
      aiProvider: d.settings?.aiProvider ?? "disabled",
      aiBaseUrl: d.settings?.aiBaseUrl ?? "",
      aiApiKey: "",
      aiModel: d.settings?.aiModel ?? "",
      aiFallbackProvider: d.settings?.aiFallbackProvider ?? "",
      aiFallbackBaseUrl: d.settings?.aiFallbackBaseUrl ?? "",
      aiFallbackApiKey: "",
      aiFallbackModel: d.settings?.aiFallbackModel ?? "",
      aiTimeoutMs: d.settings?.aiTimeoutMs ?? 20000,
      aiMaxRetries: d.settings?.aiMaxRetries ?? 2,
      aiShopDailyLimit: d.settings?.aiShopDailyLimit ?? 200,
    });
    setAiSecretSet({ apiKey: !!d.settings?.aiApiKeySet, fallbackApiKey: !!d.settings?.aiFallbackApiKeySet });
    setMyketSecretSet({
      publicKey: !!d.settings?.myketRsaPublicKeySet,
      accessToken: !!d.settings?.myketAccessTokenSet,
    });
    });
  }, []);

  async function persistSettings(payload: Record<string, unknown>) {
    setSaved(false);
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const text = res.status === 401
          ? "نشست مدیریت منقضی شده است؛ دوباره وارد شوید."
          : data?.error === "invalid_input"
            ? "یکی از مقادیر تنظیمات معتبر نیست. فیلدهای این بخش را بررسی کنید."
            : "ذخیره تنظیمات انجام نشد. دوباره تلاش کنید.";
        setSaveFeedback({ ok: false, text });
        return false;
      }
      if (typeof payload.myketRsaPublicKey === "string" && payload.myketRsaPublicKey) {
        setMyketSecretSet((s) => ({ ...s, publicKey: true }));
      }
      if (typeof payload.myketAccessToken === "string" && payload.myketAccessToken) {
        setMyketSecretSet((s) => ({ ...s, accessToken: true }));
      }
      if ("myketRsaPublicKey" in payload || "myketAccessToken" in payload) {
        setForm((f) => ({ ...f, myketRsaPublicKey: "", myketAccessToken: "" }));
      }
      setSaved(true);
      setSaveFeedback({ ok: true, text: "تنظیمات با موفقیت ذخیره شد." });
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch {
      setSaveFeedback({ ok: false, text: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    return persistSettings(form);
  }

  // One-click preset for the official OpenAI endpoint. The token still goes
  // through the same server-only encrypted secret path as every other key.
  function useOpenAiToken() {
    setForm((current) => ({
      ...current,
      aiEnabled: true,
      aiProvider: "openai-compat",
      aiBaseUrl: "https://api.openai.com/v1",
      aiModel: current.aiModel.trim() || "gpt-5-mini",
    }));
    setAiTest(null);
  }

  function useHetznerToken() {
    setForm((current) => ({
      ...current,
      aiEnabled: true,
      aiProvider: "openai-compat",
      aiBaseUrl: "https://inference.hetzner.com/api/v1",
      aiModel: "Qwen/Qwen3.6-35B-A3B-FP8",
      aiTimeoutMs: Math.max(current.aiTimeoutMs, 75000),
    }));
    setAiTest(null);
  }

  function useDeepSeekFallback() {
    setForm((current) => ({
      ...current,
      aiEnabled: true,
      aiFallbackProvider: "openai-compat",
      aiFallbackBaseUrl: "https://api.deepseek.com",
      aiFallbackModel: "deepseek-v4-pro",
      // One attempt per provider is enough; the fallback itself is the retry.
      aiMaxRetries: 0,
    }));
    setAiTest(null);
  }

  async function saveAppLinks() {
    const links = {
      androidApkUrl: form.androidApkUrl.trim(),
      bazaarUrl: form.bazaarUrl.trim(),
      myketUrl: form.myketUrl.trim(),
    };
    const ok = await persistSettings(links);
    if (ok) setForm((f) => ({ ...f, ...links }));
  }

  // Persist the current SMTP settings first, then ask the server to send a real
  // test email so the config can be verified end-to-end.
  async function sendTestEmail() {
    setTestMsg(null);
    if (!testEmailTo.trim()) { setTestMsg({ ok: false, text: "ایمیل مقصد را وارد کن." }); return; }
    setTesting(true);
    const ok = await save();
    if (!ok) { setTesting(false); setTestMsg({ ok: false, text: "ذخیره تنظیمات ناموفق بود." }); return; }
    const res = await fetch("/api/superadmin/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmailTo.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    setTesting(false);
    setTestMsg(res.ok
      ? { ok: true, text: "✅ ایمیل آزمایشی ارسال شد. صندوق ورودی (و پوشه‌ی اسپم) را چک کن." }
      : { ok: false, text: d.message || "ارسال ناموفق بود." });
  }

  // Save the current config first, then run a minimal server-side probe against
  // the saved provider. The API key is never sent back — only the outcome.
  async function testAiConnection() {
    setAiTest(null);
    setAiTesting(true);
    const ok = await save();
    if (!ok) { setAiTesting(false); setAiTest({ ok: false, text: "ذخیره تنظیمات ناموفق بود." }); return; }
    const res = await fetch("/api/superadmin/ai-test", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setAiTesting(false);
    if (res.ok) {
      setAiTest({
        ok: !!d.ok,
        text: `${d.ok ? "✅ اتصال موفق" : "❌ اتصال ناموفق"} — ارائه‌دهنده: ${d.provider ?? "-"} · مدل: ${d.model ?? "-"} · زمان: ${d.latencyMs ?? 0}ms${d.message ? " — " + d.message : ""}`,
      });
    } else {
      setAiTest({ ok: false, text: d.message || "تست ناموفق بود." });
    }
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">تنظیمات پلتفرم</h1>
      <p className="text-[11px] text-muted mb-4">
        این مقادیر بر متغیرهای محیطی Vercel اولویت دارند — تغییرشان نیازی به دیپلوی مجدد ندارد.
      </p>

      {/* Internal section tabs — wrap so they never overflow the box. */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`text-[11px] font-bold rounded-lg px-3 py-1.5 transition ${tab === key ? "bg-copper text-[#0A0F1E]" : "bg-surface2 text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ظاهر ── */}
      {tab === "appearance" && (
      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <div className="text-sm font-bold mb-1">🎨 ظاهر سایت — فونت و تم</div>
        <p className="text-[10px] text-muted mb-3">فونت و تمِ کل سایت را از همین‌جا عوض کن؛ بلافاصله و بدون دیپلوی مجدد روی همه‌ی صفحه‌ها اعمال می‌شود.</p>

        <label className="block text-[11px] font-bold mb-1.5">فونت سایت</label>
        <div className="space-y-2 mb-4">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setForm({ ...form, fontFamily: f.key })}
              className={`w-full text-right rounded-xl px-3 py-2.5 border transition ${form.fontFamily === f.key ? "border-copper bg-copper/10" : "border-surface2 bg-surface2"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold" style={{ fontFamily: f.family }}>
                  {f.label} — پیوو تعمیرگاه
                </div>
                {form.fontFamily === f.key && <span className="text-copper text-sm">✓</span>}
              </div>
              <div className="text-[10px] text-muted mt-0.5">{f.note}</div>
              <div className="text-[13px] mt-1.5 text-ink/85" style={{ fontFamily: f.family }} dir="rtl">
                نمونه: خدمات تعمیر موبایل ۱۲۳۴۵۶۷۸۹۰
              </div>
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-bold mb-1">تم پیش‌فرض بازدیدکننده‌های جدید</label>
        <p className="text-[10px] text-muted mb-2">کاربرانی که خودشان قبلاً تم را عوض کرده‌اند، انتخاب خودشان حفظ می‌شود.</p>
        <div className="flex bg-surface2 rounded-lg p-1">
          {[["dark", "🌙 شب"], ["light", "☀️ روز"]].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setForm({ ...form, defaultTheme: val })}
              className={`flex-1 text-[12px] font-bold rounded-md py-2 transition ${form.defaultTheme === val ? "bg-copper text-[#0A0F1E]" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── اشتراک ── */}
      {tab === "subs" && (
      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <div className="text-sm font-bold mb-1">💳 قیمت‌گذاری اشتراک‌ها</div>
        <p className="text-[10px] text-muted mb-3">قیمت پلن‌ها و تخفیف مدت‌ها را از همین‌جا تعیین کن. هم صفحه‌ی خریدِ مغازه‌ها و هم مبلغی که در درگاه پرداخت کسر می‌شود، بلافاصله از این مقادیر استفاده می‌کنند (بدون دیپلوی مجدد).</p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mb-3">
          <div>
            <label className="block text-[11px] font-bold mb-1">حرفه‌ای — قیمت ماهانه</label>
            <div className="relative">
              <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg pr-3 pl-12 py-2 text-sm mono"
                value={form.proPriceToman} onChange={(e) => setForm({ ...form, proPriceToman: Math.max(0, +e.target.value) })} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none">تومان</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">حرفه‌ای — سهمیه ماهانه</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              value={form.proQuota} onChange={(e) => setForm({ ...form, proQuota: Math.max(0, +e.target.value) })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">تجاری — قیمت ماهانه</label>
            <div className="relative">
              <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg pr-3 pl-12 py-2 text-sm mono"
                value={form.businessPriceToman} onChange={(e) => setForm({ ...form, businessPriceToman: Math.max(0, +e.target.value) })} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none">تومان</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">تجاری — سهمیه ماهانه</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
              value={form.businessQuota} onChange={(e) => setForm({ ...form, businessQuota: Math.max(0, +e.target.value) })} />
            <p className="text-[9px] text-muted mt-0.5">۱۰۰٬۰۰۰ به بالا = نامحدود</p>
          </div>
        </div>

        <label className="block text-[11px] font-bold mb-1.5">تخفیف مدت‌های بلندتر (درصد)</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([["discount3", "۳ ماهه"], ["discount6", "۶ ماهه"], ["discount12", "۱۲ ماهه"]] as const).map(([field, label]) => (
            <div key={field}>
              <span className="block text-[10px] text-muted mb-1">{label}</span>
              <div className="relative">
                <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg pr-3 pl-7 py-2 text-sm mono"
                  value={form[field]} onChange={(e) => setForm({ ...form, [field]: Math.min(100, Math.max(0, +e.target.value)) })} />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none">٪</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface2 rounded-lg p-2.5 text-[11px] space-y-1">
          <div className="text-muted mb-1">پیش‌نمایش مبلغ نهایی (با احتساب تخفیف):</div>
          {([["حرفه‌ای", form.proPriceToman], ["تجاری", form.businessPriceToman]] as const).map(([label, price]) => (
            <div key={label} className="flex justify-between">
              <span>{label} · ۱۲ ماهه</span>
              <span className="mono font-bold">{Math.round((price * 12 * (100 - form.discount12)) / 100).toLocaleString("fa-IR")} تومان</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ── پیامک ── */}
      {tab === "sms" && (
      <div>
        <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
          <div className="text-sm font-bold mb-2">📨 پیامک (کاوه‌نگار)</div>
          <label className="block text-xs text-muted mb-1">کلید API کاوه‌نگار</label>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
            value={form.kavenegarApiKey} onChange={(e) => setForm({ ...form, kavenegarApiKey: e.target.value })} />

          <label className="block text-xs text-muted mb-1">شماره خط ارسال کاوه‌نگار</label>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.kavenegarSender} onChange={(e) => setForm({ ...form, kavenegarSender: e.target.value })} />
        </div>

        {/* Kavenegar Lookup (OTP/verification templates) — lets the 3 core SMS
            send without a dedicated line. */}
        <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-bold">📩 ارسال با لوکاپ (سرویس اعتبارسنجی)</div>
            <button type="button" onClick={() => setForm({ ...form, smsUseLookup: !form.smsUseLookup })}
              className={`text-[11px] font-bold rounded-full px-3 py-1 transition ${form.smsUseLookup ? "bg-teal text-white" : "bg-surface2 text-muted"}`}>
              {form.smsUseLookup ? "روشن" : "خاموش"}
            </button>
          </div>
          <p className="text-[10px] text-muted mb-3">
            اگر خط اختصاصی نداری، کدهای تایید و پیامک‌های پذیرش/آماده‌تحویل را با «الگوی لوکاپ» بفرست (روی خط خدماتی، بدون خرید خط). ابتدا هر الگو را در پنل کاوه‌نگار (سرویس اعتبارسنجی ← ساخت الگو) بساز و به تایید برسان، بعد نام دقیق همان الگو را این‌جا وارد کن.
          </p>
          {form.smsUseLookup && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">نام الگوی کد تایید</label>
                <input dir="ltr" placeholder="peyvocode" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
                  value={form.kavenegarOtpTemplate} onChange={(e) => setForm({ ...form, kavenegarOtpTemplate: e.target.value })} />
                <p className="text-[9px] text-muted mt-1" dir="rtl">متن الگو: «کد تایید پیوو: <span className="mono">%token</span>»</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">نام الگوی پذیرش دستگاه</label>
                <input dir="ltr" placeholder="peyvointake" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
                  value={form.kavenegarIntakeTemplate} onChange={(e) => setForm({ ...form, kavenegarIntakeTemplate: e.target.value })} />
                <p className="text-[9px] text-muted mt-1" dir="rtl">متن الگو: «<span className="mono">%token10</span> - دستگاه شما با کد پیگیری <span className="mono">%token</span> پذیرش شد. تماس: <span className="mono">%token2</span>»</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">نام الگوی آماده تحویل</label>
                <input dir="ltr" placeholder="peyvoready" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
                  value={form.kavenegarReadyTemplate} onChange={(e) => setForm({ ...form, kavenegarReadyTemplate: e.target.value })} />
                <p className="text-[9px] text-muted mt-1" dir="rtl">متن الگو: «<span className="mono">%token10</span> - دستگاه شما با کد پیگیری <span className="mono">%token</span> آماده تحویل است. مبلغ: <span className="mono">%token2</span> تومان. تماس: <span className="mono">%token3</span>»</p>
              </div>
              <p className="text-[10px] text-amber" dir="rtl">توجه: در توکن‌ها فاصله مجاز نیست، جز <span className="mono">token10</span> (نام مغازه). تا وقتی الگوها در کاوه‌نگار تایید نشده‌اند، این گزینه را روشن نکن.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── پرداخت ── */}
      {tab === "payment" && (
      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <label className="block text-xs font-bold mb-1">درگاه پرداخت فعال</label>
        <p className="text-[10px] text-muted mb-2">هر پرداخت با همان درگاهی که شروع شده تأیید می‌شود؛ پس می‌توانید هر زمان بدون مشکل درگاه فعال را عوض کنید.</p>
        <div className="flex bg-surface2 rounded-lg p-1 mb-3">
          {[["zarinpal", "زرین‌پال"], ["zibal", "زیبال"], ["nextpay", "نکست‌پی"]].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setForm({ ...form, paymentProvider: val })}
              className={`flex-1 text-[11px] font-bold rounded-md py-2 transition ${form.paymentProvider === val ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>

        <label className="block text-[11px] text-muted mb-1">مرچنت کد زرین‌پال {form.paymentProvider === "zarinpal" && <span className="text-teal">(فعال)</span>}</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2" dir="ltr"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={form.zarinpalMerchantId} onChange={(e) => setForm({ ...form, zarinpalMerchantId: e.target.value })} />

        <label className="block text-[11px] text-muted mb-1">مرچنت زیبال {form.paymentProvider === "zibal" && <span className="text-teal">(فعال)</span>}</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-1" dir="ltr"
          placeholder="merchant (برای تست: zibal)"
          value={form.zibalMerchant} onChange={(e) => setForm({ ...form, zibalMerchant: e.target.value })} />
        <p className="text-[10px] text-muted mb-2">اگر خالی بگذارید، از مرچنت تستِ «zibal» استفاده می‌شود (فقط برای آزمایش).</p>

        <label className="block text-[11px] text-muted mb-1">کلید API نکست‌پی {form.paymentProvider === "nextpay" && <span className="text-teal">(فعال)</span>}</label>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" dir="ltr"
          value={form.nextpayApiKey} onChange={(e) => setForm({ ...form, nextpayApiKey: e.target.value })} />

        <div className="border-t border-surface2 mt-5 pt-4">
          <div className="text-sm font-bold mb-1">🛍️ سرویس‌های کافه‌بازار</div>
          <p className="text-[10px] text-muted leading-5 mb-3">
            این کلیدها برای پرداخت درون‌برنامه‌ای و تخفیف پویای بازار نگهداری می‌شوند. ثبت آن‌ها به‌تنهایی این امکانات را فعال نمی‌کند و اطلاعات از بخش عمومی سایت نمایش داده نمی‌شود.
          </p>
          <label className="block text-[11px] font-bold mb-1">کلید عمومی RSA کافه‌بازار</label>
          <textarea dir="ltr" rows={6} spellCheck={false}
            placeholder="-----BEGIN PUBLIC KEY-----"
            className="w-full resize-y bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs mono mb-3"
            value={form.bazaarRsaPublicKey} onChange={(e) => setForm({ ...form, bazaarRsaPublicKey: e.target.value })} />
          <label className="block text-[11px] font-bold mb-1">کلید تخفیف پویا</label>
          <input type="password" dir="ltr" autoComplete="off"
            placeholder="کلید دریافت‌شده از پنل توسعه‌دهندگان بازار"
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={form.bazaarDynamicDiscountKey} onChange={(e) => setForm({ ...form, bazaarDynamicDiscountKey: e.target.value })} />
          <p className="text-[9px] text-amber mt-2">کلید خصوصی امضای APK را در این قسمت وارد نکنید.</p>
        </div>

        <div className="border-t border-surface2 mt-5 pt-4">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-sm font-bold">🟢 پرداخت درون‌برنامه‌ای مایکت</div>
            <span className={`text-[10px] font-bold rounded-full px-2 py-1 ${myketSecretSet.publicKey && myketSecretSet.accessToken ? "bg-teal/20 text-teal" : "bg-amber/20 text-amber"}`}>
              {myketSecretSet.publicKey && myketSecretSet.accessToken ? "تنظیم‌شده" : "نیازمند تکمیل"}
            </span>
          </div>
          <p className="text-[10px] text-muted leading-5 mb-3">
            «کلید عمومی RSA» و «توکن دسترسی API» را از پنل توسعه‌دهندگان مایکت وارد کنید. توکن دسترسی فقط روی سرور برای تأیید خرید استفاده می‌شود و داخل APK قرار نمی‌گیرد.
          </p>

          <label className="block text-[11px] font-bold mb-1">
            کلید عمومی RSA مایکت {myketSecretSet.publicKey && <span className="text-teal">(قبلاً ذخیره شده)</span>}
          </label>
          <textarea dir="ltr" rows={5} spellCheck={false}
            placeholder={myketSecretSet.publicKey ? "برای حفظ مقدار قبلی خالی بگذارید" : "-----BEGIN PUBLIC KEY-----"}
            className="w-full resize-y bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs mono mb-3"
            value={form.myketRsaPublicKey} onChange={(e) => setForm({ ...form, myketRsaPublicKey: e.target.value })} />

          <label className="block text-[11px] font-bold mb-1">
            توکن دسترسی API مایکت {myketSecretSet.accessToken && <span className="text-teal">(قبلاً ذخیره شده)</span>}
          </label>
          <input type="password" dir="ltr" autoComplete="off"
            placeholder={myketSecretSet.accessToken ? "برای حفظ مقدار قبلی خالی بگذارید" : "X-Access-Token پنل مایکت"}
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={form.myketAccessToken} onChange={(e) => setForm({ ...form, myketAccessToken: e.target.value })} />
          <p className="text-[9px] text-amber mt-2">
            این دو مقدار با فیلدهای کافه‌بازار متفاوت‌اند. کلید یا توکن مایکت را در قسمت بازار وارد نکنید.
          </p>
        </div>
      </div>
      )}

      {/* ── ایمیل (SMTP) ── */}
      {tab === "email" && (
      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <div className="text-sm font-bold mb-1">✉️ ایمیل (SMTP)</div>
        <p className="text-[10px] text-muted mb-3">
          برای ارسال ایمیل (مثلاً کد بازیابی رمز از طریق ایمیل). با Gmail: هاست <span dir="ltr">smtp.gmail.com</span>، پورت ۵۸۷، و به‌جای رمز عبور معمولی از «App Password» جیمیل استفاده کن.
        </p>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" placeholder="smtp.gmail.com"
            value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
          <input type="number" dir="ltr" className="w-20 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" placeholder="587"
            value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: +e.target.value })} />
        </div>
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3" dir="ltr" placeholder="آدرس ایمیل کاربری SMTP"
          value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
        <input type="password" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3" placeholder="رمز عبور / App Password"
          value={form.smtpPassword} onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })} />
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4" dir="ltr" placeholder="آدرس فرستنده (اختیاری، پیش‌فرض همان کاربری بالاست)"
          value={form.smtpFromAddress} onChange={(e) => setForm({ ...form, smtpFromAddress: e.target.value })} />

        {/* End-to-end verification */}
        <div className="border-t border-surface2 pt-3">
          <label className="block text-[11px] font-bold mb-1">تست ارسال ایمیل</label>
          <p className="text-[10px] text-muted mb-2">یک ایمیل آزمایشی بفرست تا مطمئن شوی تنظیمات درست کار می‌کند. (اول ذخیره می‌شود، بعد ارسال.)</p>
          <div className="flex gap-2">
            <input dir="ltr" type="email" placeholder="you@example.com"
              className="flex-1 min-w-0 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm"
              value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} />
            <button type="button" onClick={sendTestEmail} disabled={testing}
              className="bg-teal text-white font-bold rounded-lg px-4 text-sm disabled:opacity-50 shrink-0">
              {testing ? "..." : "ارسال تست"}
            </button>
          </div>
          {testMsg && <p className={`text-xs mt-2 ${testMsg.ok ? "text-teal" : "text-danger"}`}>{testMsg.text}</p>}
        </div>
      </div>
      )}

      {/* ── اعتماد (اینماد) ── */}
      {tab === "trust" && (
      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
        <div className="text-sm font-bold mb-2">🛡️ نماد اعتماد الکترونیکی (اینماد)</div>
        <p className="text-[10px] text-muted mb-2">
          از پنل <span dir="ltr">enamad.ir</span> مقدار <span dir="ltr">id</span> و <span dir="ltr">Code</span> نماد را کپی کنید. به‌محض ذخیره، لوگوی اینماد در صفحات عمومی سایت (ورود و درباره ما) نمایش داده می‌شود — بدون <span dir="ltr">rel="noopener noreferrer"</span> تا اینماد بتواند آن را تأیید کند.
        </p>
        <div className="flex gap-2">
          <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono" dir="ltr" placeholder="id (مثلاً 123456)"
            value={form.enamadId} onChange={(e) => setForm({ ...form, enamadId: e.target.value })} />
          <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono" dir="ltr" placeholder="Code"
            value={form.enamadCode} onChange={(e) => setForm({ ...form, enamadCode: e.target.value })} />
        </div>
      </div>
      )}

      {/* ── سایر (نقشه، راهنما) ── */}
      {tab === "other" && (
      <div>
        <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
          <div className="text-sm font-bold mb-1">📱 اپلیکیشن اندروید</div>
          <p className="text-[10px] text-muted mb-2">
            بعد از ساختِ فایل APK و انتشار در کافه‌بازار/مایکت، لینک‌ها را این‌جا بگذار تا در صفحه‌ی «دانلود» سایت (<span dir="ltr">/download</span>) و فوترِ صفحه‌ی اصلی نمایش داده شوند.
          </p>
          <label className="block text-[11px] text-muted mb-1">لینک مستقیم فایل APK</label>
          <input dir="ltr" placeholder="https://.../peyvo.apk" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2"
            value={form.androidApkUrl} onChange={(e) => setForm({ ...form, androidApkUrl: e.target.value })} />
          <label className="block text-[11px] text-muted mb-1">لینک کافه‌بازار</label>
          <input dir="ltr" placeholder="https://cafebazaar.ir/app/com.peyvo.app" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2"
            value={form.bazaarUrl} onChange={(e) => setForm({ ...form, bazaarUrl: e.target.value })} />
          <label className="block text-[11px] text-muted mb-1">لینک مایکت</label>
          <input dir="ltr" placeholder="https://myket.ir/app/com.peyvo.app" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.myketUrl} onChange={(e) => setForm({ ...form, myketUrl: e.target.value })} />
          <button type="button" onClick={saveAppLinks} disabled={saving}
            className="mt-3 w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "در حال ذخیره…" : "ذخیره لینک‌های اپلیکیشن"}
          </button>
          {saveFeedback && <p className={`mt-2 text-xs ${saveFeedback.ok ? "text-teal" : "text-danger"}`}>{saveFeedback.text}</p>}
        </div>

        <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
          <div className="text-sm font-bold mb-1">🗺️ نقشه (نشان)</div>
          <p className="text-[10px] text-muted mb-2">
            از <span dir="ltr">platform.neshan.org</span> ثبت‌نام کنید و کلید «نقشه وب» بگیرید — برای نقشه‌ی تعاملی انتخاب موقعیت مغازه استفاده می‌شود.
          </p>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" placeholder="کلید نقشه نشان"
            value={form.neshanApiKey} onChange={(e) => setForm({ ...form, neshanApiKey: e.target.value })} />
        </div>

        <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4">
          <div className="text-sm font-bold mb-1">📘 راهنما و درباره ما</div>
          <label className="block text-xs text-muted mb-1 mt-1">لینک راهنمای سایت (دامنه خارجی یا داخلی)</label>
          <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
            placeholder="https://help.example.com"
            value={form.guideUrl} onChange={(e) => setForm({ ...form, guideUrl: e.target.value })} />
          <label className="block text-xs text-muted mb-1">متن صفحه «درباره ما»</label>
          <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm" rows={4}
            value={form.aboutUsContent} onChange={(e) => setForm({ ...form, aboutUsContent: e.target.value })} />
        </div>
      </div>
      )}

      {/* ── هوش مصنوعی ── */}
      {tab === "ai" && (
      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">🤖 هوش مصنوعی — ارائه‌دهنده</div>
          <button type="button" onClick={() => setForm({ ...form, aiEnabled: !form.aiEnabled })}
            className={`text-[11px] font-bold rounded-full px-3 py-1 transition ${form.aiEnabled ? "bg-teal text-white" : "bg-surface2 text-muted"}`}>
            {form.aiEnabled ? "فعال" : "غیرفعال"}
          </button>
        </div>
        <p className="text-[10px] text-muted">توکن یا کلید API به‌صورت امن در سرور نگهداری می‌شود، هرگز دوباره به مرورگر برگردانده نمی‌شود و بر مقدار تنظیم‌شده در Vercel اولویت دارد.</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={useHetznerToken}
            className="w-full rounded-xl border border-copper/35 bg-copper/10 px-3 py-3 text-right transition hover:bg-copper/15">
            <span className="block text-sm font-extrabold text-copper">اتصال رایگان Hetzner</span>
            <span className="mt-1 block text-[10px] leading-5 text-muted">آدرس Inference و مدل Qwen خودکار تنظیم می‌شود؛ فقط توکن Hetzner را پایین وارد کن.</span>
          </button>
          <button type="button" onClick={useOpenAiToken}
            className="w-full rounded-xl border border-teal/30 bg-teal/10 px-3 py-3 text-right transition hover:bg-teal/15">
            <span className="block text-sm font-extrabold text-teal">اتصال مستقیم OpenAI</span>
            <span className="mt-1 block text-[10px] leading-5 text-muted">آدرس رسمی OpenAI و مدل پیشنهادی خودکار تنظیم می‌شوند؛ نیازمند اعتبار API است.</span>
          </button>
        </div>

        {/* Primary provider */}
        <div className="border-t border-surface2 pt-3">
          <div className="text-[12px] font-bold mb-2">ارائه‌دهنده اصلی</div>
          <label className="block text-[11px] text-muted mb-1">نوع</label>
          <select dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2"
            value={form.aiProvider} onChange={(e) => setForm({ ...form, aiProvider: e.target.value })}>
            <option value="disabled">disabled (خاموش)</option>
            <option value="mock">mock (تست محلی)</option>
            <option value="openai-compat">OpenAI / سرویس سازگار</option>
          </select>
          <label className="block text-[11px] text-muted mb-1">مدل</label>
          <input dir="ltr" placeholder="gpt-5-mini" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2 mono"
            value={form.aiModel} onChange={(e) => setForm({ ...form, aiModel: e.target.value })} />
          <label className="block text-[11px] text-muted mb-1">Base URL</label>
          <input dir="ltr" placeholder="https://…/v1" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2 mono"
            value={form.aiBaseUrl} onChange={(e) => setForm({ ...form, aiBaseUrl: e.target.value })} />
          <label className="block text-[11px] text-muted mb-1">توکن ارائه‌دهنده / کلید API {aiSecretSet.apiKey && <span className="text-teal">(ذخیره‌شده ✓ — برای تغییر مقدار جدید وارد کن)</span>}</label>
          <input type="password" dir="ltr" autoComplete="off" placeholder={aiSecretSet.apiKey ? "•••••• (بدون تغییر)" : ""}
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={form.aiApiKey} onChange={(e) => setForm({ ...form, aiApiKey: e.target.value })} />
          <p className="mt-1.5 text-[10px] leading-5 text-muted">توکن در APK یا صفحات عمومی قرار نمی‌گیرد. برای Hetzner حتماً توکن را از <span dir="ltr">experiments.hetzner.com → Inference → Create API Token</span> بگیر؛ توکن بخش Cloud/Security معتبر نیست.</p>
        </div>

        {/* Fallback provider */}
        <div className="border-t border-surface2 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] font-bold">ارائه‌دهنده جایگزین (اختیاری)</div>
            <button type="button" onClick={useDeepSeekFallback}
              className="rounded-lg border border-teal/30 bg-teal/10 px-3 py-1.5 text-[10px] font-bold text-teal hover:bg-teal/15">
              تنظیم خودکار DeepSeek جایگزین
            </button>
          </div>
          <p className="mb-2 text-[10px] leading-5 text-muted">اگر Hetzner پاسخ ندهد، درخواست به‌صورت خودکار با کلید مستقل DeepSeek ادامه پیدا می‌کند. کلید DeepSeek را در فیلد پایین وارد کن.</p>
          <label className="block text-[11px] text-muted mb-1">نوع</label>
          <select dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2"
            value={form.aiFallbackProvider} onChange={(e) => setForm({ ...form, aiFallbackProvider: e.target.value })}>
            <option value="">بدون جایگزین</option>
            <option value="mock">mock</option>
            <option value="openai-compat">openai-compat</option>
          </select>
          <label className="block text-[11px] text-muted mb-1">مدل جایگزین</label>
          <input dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2 mono"
            value={form.aiFallbackModel} onChange={(e) => setForm({ ...form, aiFallbackModel: e.target.value })} />
          <label className="block text-[11px] text-muted mb-1">Base URL جایگزین</label>
          <input dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-2 mono"
            value={form.aiFallbackBaseUrl} onChange={(e) => setForm({ ...form, aiFallbackBaseUrl: e.target.value })} />
          <label className="block text-[11px] text-muted mb-1">کلید API جایگزین {aiSecretSet.fallbackApiKey && <span className="text-teal">(ذخیره‌شده ✓)</span>}</label>
          <input type="password" dir="ltr" autoComplete="off" placeholder={aiSecretSet.fallbackApiKey ? "•••••• (بدون تغییر)" : ""}
            className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={form.aiFallbackApiKey} onChange={(e) => setForm({ ...form, aiFallbackApiKey: e.target.value })} />
        </div>

        {/* Limits */}
        <div className="border-t border-surface2 pt-3 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-muted mb-1">Timeout (ms)</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm mono"
              value={form.aiTimeoutMs} onChange={(e) => setForm({ ...form, aiTimeoutMs: Math.max(1000, +e.target.value) })} />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-1">Max retries</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm mono"
              value={form.aiMaxRetries} onChange={(e) => setForm({ ...form, aiMaxRetries: Math.max(0, Math.min(10, +e.target.value)) })} />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-1">سهمیه روزانه هر مغازه</label>
            <input type="number" dir="ltr" className="w-full bg-surface2 border border-surface2 rounded-lg px-2 py-2 text-sm mono"
              value={form.aiShopDailyLimit} onChange={(e) => setForm({ ...form, aiShopDailyLimit: Math.max(0, +e.target.value) })} />
          </div>
        </div>

        {/* Test connection */}
        <div className="border-t border-surface2 pt-3">
          <button type="button" onClick={testAiConnection} disabled={aiTesting}
            className="bg-teal text-white font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            {aiTesting ? "در حال تست…" : "تست اتصال"}
          </button>
          <p className="text-[10px] text-muted mt-1">اول تنظیمات ذخیره می‌شود، بعد یک درخواست کوچک آزمایشی فرستاده می‌شود. برای Hetzner زمان انتظار حداقل ۷۵ ثانیه در نظر گرفته می‌شود.</p>
          {aiTest && <p className={`text-xs mt-2 ${aiTest.ok ? "text-teal" : "text-danger"}`}>{aiTest.text}</p>}
        </div>
      </div>
      )}

      <button onClick={save} disabled={saving} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
        {saving ? "در حال ذخیره…" : saved ? "✅ ذخیره شد" : "ذخیره تنظیمات"}
      </button>
      {tab !== "other" && saveFeedback && <p className={`mt-2 text-center text-xs ${saveFeedback.ok ? "text-teal" : "text-danger"}`}>{saveFeedback.text}</p>}
    </div>
  );
}
