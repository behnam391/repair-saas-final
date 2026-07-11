"use client";
import { useEffect, useState } from "react";

type Ticket = {
  id: string; subject: string; message: string; status: string; createdAt: string;
  replies: { id: string; message: string; fromPlatform: boolean; createdAt: string }[];
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/support");
    if (res.ok) setTickets((await res.json()).tickets ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.subject || !form.message) return;
    await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ subject: "", message: "" });
    load();
  }

  async function reply(id: string) {
    const message = replyDraft[id]?.trim();
    if (!message) return;
    await fetch(`/api/support/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setReplyDraft({ ...replyDraft, [id]: "" });
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">پشتیبانی</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6 space-y-2">
        <div className="text-sm font-bold mb-1">ارسال تیکت جدید</div>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="موضوع"
          value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <textarea className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="توضیح مشکل یا سوال شما"
          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button onClick={submit} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">ارسال تیکت</button>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">{t.subject}</span>
              <span className={t.status === "OPEN" ? "text-amber" : "text-teal"}>{t.status === "OPEN" ? "باز" : "بسته"}</span>
            </div>
            <div className="text-muted mt-1">{t.message}</div>
            {t.replies.map((r) => (
              <div key={r.id} className={`mt-2 rounded-lg px-2.5 py-1.5 ${r.fromPlatform ? "bg-teal/10 text-teal" : "bg-surface"}`}>
                {r.fromPlatform ? "پشتیبانی: " : "شما: "}{r.message}
              </div>
            ))}
            {t.status === "OPEN" && (
              <div className="flex gap-2 mt-2">
                <input className="flex-1 bg-surface rounded-lg px-2 py-1.5 text-xs" placeholder="پاسخ..."
                  value={replyDraft[t.id] || ""} onChange={(e) => setReplyDraft({ ...replyDraft, [t.id]: e.target.value })} />
                <button onClick={() => reply(t.id)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3">ارسال</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
