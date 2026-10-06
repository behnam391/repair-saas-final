"use client";
import { useState } from "react";
import { BarChart3, BrainCircuit, CheckCircle2, FlaskConical, Goal, Loader2, Megaphone, Scale, ShieldAlert, Sparkles, Target, TimerReset } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import "./marketing-advisor.css";

type Mode = "growth" | "strategy" | "council";
type Analysis = { executiveSummary: string; diagnosis: string[]; decisions: string[]; plan7: string[]; plan30: string[]; plan90: string[]; kpis: {name:string;target:string;why:string}[]; experiments: string[]; risks: string[] };

const MODES = [
  { key: "strategy" as const, title: "استراتژی بازار", subtitle: "نگاه کلان و جایگاه‌یابی", icon: Target, description: "بخش‌بندی، انتخاب بازار هدف، جایگاه برند، ۷P و کنترل شاخص‌ها؛ بر پایه اصول عمومی مدیریت بازاریابی." },
  { key: "growth" as const, title: "رشد و پیشنهاد", subtitle: "پیشنهاد، لید و تبدیل", icon: Megaphone, description: "ارزش پیشنهادی، کاهش ریسک، مسیر جذب، تبدیل، پیگیری و ارجاع؛ بر پایه چارچوب‌های عمومی رشد." },
  { key: "council" as const, title: "شورای ترکیبی", subtitle: "استراتژی سپس اجرا", icon: BrainCircuit, description: "ابتدا بازار و جایگاه را مشخص می‌کند، سپس پیشنهاد و برنامه جذب متناسب با آن می‌سازد." },
];
const AUDIENCES = ["تعمیرکاران موبایل", "تعمیرکاران کامپیوتر", "تعمیرکاران لوازم خانگی", "تکنسین‌های تأسیسات", "تعمیرگاه خودرو و موتورسیکلت", "تجهیزات برقی و صنعتی", "همه صنف‌های فعال پیوو"];

export default function MarketingAdvisorPage() {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("council");
  const [objective, setObjective] = useState("افزایش ثبت‌نام تعمیرگاه‌های واقعی و تبدیل آن‌ها به کاربران فعال و سپس مشترک حرفه‌ای، بدون بودجه تبلیغاتی سنگین");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [constraints, setConstraints] = useState("بودجه تبلیغاتی فعلاً نزدیک به صفر است؛ تیم کوچک است و راهکارها باید در ایران قابل اجرا باشند.");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [disclaimer, setDisclaimer] = useState("");

  async function run() {
    setLoading(true); setAnalysis(null);
    try {
      const response = await fetch("/api/superadmin/marketing-advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, objective, audience, constraints }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "تحلیل ساخته نشد");
      setAnalysis(data.analysis); setDisclaimer(data.disclaimer || "");
      showToast({ title: "تحلیل بازاریابی آماده شد", message: "خروجی بر اساس آمار تجمیعی فعلی پیوو ساخته شد.", type: "success" });
    } catch (error) { showToast({ title: "ساخت تحلیل ناموفق بود", message: error instanceof Error ? error.message : "دوباره تلاش کنید.", type: "error" }); }
    finally { setLoading(false); }
  }

  return <div className="marketing-lab" dir="rtl">
    <header className="ml-head"><div><span><Sparkles size={14}/> PEYVO MARKETING INTELLIGENCE</span><h1>اتاق فکر بازاریابی پیوو</h1><p>تحلیل داده‌های تجمیعی پلتفرم و تبدیل چارچوب‌های معتبر بازاریابی به تصمیم اجرایی.</p></div><div className="ml-principle"><ShieldAlert size={18}/><p><b>مشاور تصمیم، نه تقلید شخصیت</b>این ابزار کلون یا نماینده هیچ فردی نیست و متن کتاب یا دوره‌ای را بازتولید نمی‌کند.</p></div></header>

    <section className="ml-modes">{MODES.map(item => <button key={item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)}><i><item.icon size={21}/></i><span><b>{item.title}</b><small>{item.subtitle}</small></span><p>{item.description}</p></button>)}</section>

    <section className="ml-brief"><div className="ml-brief-title"><Goal size={19}/><div><h2>صورت مسئله</h2><p>هرچه هدف دقیق‌تر باشد، برنامه اجرایی‌تر می‌شود.</p></div></div><div className="ml-fields"><label className="wide"><span>هدف اصلی</span><textarea value={objective} onChange={event => setObjective(event.target.value)} rows={3} maxLength={1500}/><small>{objective.length.toLocaleString("fa-IR")} از ۱۵۰۰ نویسه</small></label><label><span>بازار هدف</span><select value={audience} onChange={event => setAudience(event.target.value)}>{AUDIENCES.map(item => <option key={item}>{item}</option>)}</select></label><label><span>محدودیت‌ها و منابع</span><textarea value={constraints} onChange={event => setConstraints(event.target.value)} rows={3} maxLength={600}/></label></div><button className="ml-run" disabled={loading || objective.trim().length < 10} onClick={run}>{loading ? <><Loader2 className="animate-spin" size={18}/> در حال تحلیل داده‌ها…</> : <><BrainCircuit size={19}/> تشکیل جلسه و ساخت برنامه</>}</button></section>

    {!analysis && !loading && <section className="ml-empty"><BrainCircuit size={34}/><h2>برای یک تصمیم واقعی آماده است</h2><p>سامانه فقط آمار تجمیعی مانند تعداد فروشگاه‌ها، صنف‌ها، فعالیت ۳۰ روزه و خرید اشتراک را می‌بیند؛ هیچ نام، تلفن یا متن پرونده‌ای ارسال نمی‌شود.</p><div><span><Target/> STP و جایگاه‌یابی</span><span><Scale/> ارزش و پیشنهاد</span><span><BarChart3/> KPI و کنترل</span></div></section>}

    {analysis && <div className="ml-result">
      <section className="ml-summary"><span><Sparkles size={18}/> جمع‌بندی مدیریتی</span><p>{analysis.executiveSummary}</p></section>
      <div className="ml-result-grid"><ResultList title="تشخیص وضعیت" icon={BarChart3} items={analysis.diagnosis}/><ResultList title="تصمیم‌های پیشنهادی" icon={CheckCircle2} items={analysis.decisions}/></div>
      <section className="ml-timeline"><h2><TimerReset size={19}/> نقشه اجرای ۷، ۳۰ و ۹۰ روزه</h2><div><ResultList title="۷ روز اول" icon={Goal} items={analysis.plan7}/><ResultList title="تا ۳۰ روز" icon={Target} items={analysis.plan30}/><ResultList title="تا ۹۰ روز" icon={BarChart3} items={analysis.plan90}/></div></section>
      <section className="ml-kpis"><h2>شاخص‌های کنترل</h2><div>{analysis.kpis.map((item,index) => <article key={`${item.name}-${index}`}><small>{item.name}</small><strong>{item.target}</strong><p>{item.why}</p></article>)}</div></section>
      <div className="ml-result-grid"><ResultList title="آزمایش‌های کم‌هزینه" icon={FlaskConical} items={analysis.experiments}/><ResultList title="ریسک‌ها و خط قرمزها" icon={ShieldAlert} items={analysis.risks}/></div>
      <p className="ml-disclaimer">{disclaimer}</p>
    </div>}
  </div>;
}

function ResultList({ title, icon: Icon, items }: { title: string; icon: typeof Goal; items: string[] }) {
  return <section className="ml-list"><h2><Icon size={18}/>{title}</h2>{items.length ? <ol>{items.map((item,index) => <li key={index}><span>{(index+1).toLocaleString("fa-IR")}</span><p>{item}</p></li>)}</ol> : <p className="ml-muted">موردی پیشنهاد نشد.</p>}</section>;
}
