"use client";
/**
 * Two-way customer⇄shop chat for a single repair ticket. Same component on
 * both sides; `iAmCustomer` flips which bubbles are "mine". `endpoint` is the
 * GET/POST messages URL (customer: /api/customer/repairs/:id/messages,
 * shop: /api/tickets/:id/messages).
 */
import { useEffect, useRef, useState } from "react";
import { formatJalaliTime } from "@/lib/jalali";

type Msg = { id: string; fromCustomer: boolean; content: string; createdAt: string };

export default function TicketChat({ endpoint, iAmCustomer }: { endpoint: string; iAmCustomer: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch(endpoint);
      if (r.ok) setMessages((await r.json()).messages ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 6000); // light polling — good enough for chat
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSending(false);
    if (res.ok) {
      const { message } = await res.json();
      setMessages((m) => [...m, message]);
      setText("");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-1 min-h-[180px] max-h-[46vh]">
        {loading ? (
          <p className="text-muted text-xs text-center py-6">در حال بارگذاری گفتگو...</p>
        ) : messages.length === 0 ? (
          <p className="text-muted text-xs text-center py-6">هنوز پیامی رد و بدل نشده. اولین پیام را بفرستید.</p>
        ) : (
          messages.map((m) => {
            const mine = iAmCustomer ? m.fromCustomer : !m.fromCustomer;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs ${
                  mine ? "bg-copper text-white rounded-bl-sm" : "bg-surface2 border border-border rounded-br-sm"
                }`}>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={`text-[9px] mt-1 ${mine ? "text-white/70" : "text-muted"}`}>{formatJalaliTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-surface2 mt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="پیام خود را بنویسید..."
          className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2 text-sm"
        />
        <button onClick={send} disabled={sending || !text.trim()}
          className="bg-copper text-white font-bold rounded-xl px-4 text-sm disabled:opacity-50">
          ارسال
        </button>
      </div>
    </div>
  );
}
