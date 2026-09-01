"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Boxes, ChevronDown, Clock3, MessageCircle, Sparkles, Star } from "lucide-react";
import Image from "next/image";

type Insight = { tone: string; icon: string; title: string; detail: string };
const ICONS: Record<string, any> = { clock: Clock3, stock: Boxes, message: MessageCircle, profit: Banknote, star: Star };

export default function MorningInsights() {
  const [items, setItems] = useState<Insight[]>([]);
  const [open, setOpen] = useState(true);
  useEffect(() => { fetch("/api/dashboard/insights").then(r => r.json()).then(d => setItems(d.insights ?? [])).catch(() => {}); }, []);
  if (!items.length) return null;
  return <section className="morning-insights">
    <div className="morning-mascot" aria-hidden="true"><Image src="/images/peyvo-ai-assistant-v2.png" alt="" width={105} height={147} /></div>
    <button className="morning-insights-head" onClick={() => setOpen(v => !v)}>
      <span><i><Sparkles size={17} /></i><span><b>نبض هوشمند امروز</b><small>موارد مهمی که قبل از شروع کار باید بدانید</small></span></span>
      <span className="morning-count">{items.length.toLocaleString("fa-IR")} هشدار <ChevronDown size={15} className={open ? "rotate-180" : ""} /></span>
    </button>
    {open && <div className="morning-insights-grid">{items.map((item, index) => { const Icon = ICONS[item.icon] ?? AlertTriangle; return <article className={`morning-insight is-${item.tone}`} key={index}><i><Icon size={17} /></i><div><b>{item.title}</b><small>{item.detail}</small></div></article>; })}</div>}
  </section>;
}
