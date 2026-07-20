"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type ConvoListItem = {
  id: string;
  listing: { id: string; title: string; authorId: string; author: { name: string } };
  starter: { id: string; name: string };
  messages: { content: string; createdAt: string }[];
};
type Msg = { id: string; content: string; imageUrl: string | null; createdAt: string; senderId: string; sender: { name: string } };

// One-tap canned replies — the phrases technicians/dealers type all day.
const CANNED_MESSAGES = [
  "سلام، موجوده؟",
  "قیمت نهایی چنده؟",
  "لطفاً عکس بفرستید",
  "آدرس دقیق را بفرستید",
  "ارسال به شهرستان دارید؟",
  "تست‌شده و سالمه؟",
  "باشه، هماهنگ می‌کنیم ✅",
];

export default function ChatsPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");

  const [conversations, setConversations] = useState<ConvoListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(openParam);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations((await res.json()).conversations ?? []);
  }

  async function loadMessages(id: string) {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.ok) setMessages((await res.json()).messages ?? []);
  }

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 4000); // simple polling, no websockets
    return () => clearInterval(interval);
  }, [activeId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text?: string, imageUrl?: string) {
    const content = (text ?? draft).trim();
    if ((!content && !imageUrl) || !activeId) return;
    const res = await fetch(`/api/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl }),
    });
    if (res.ok) {
      if (text === undefined) setDraft("");
      loadMessages(activeId);
      loadConversations();
    }
  }

  async function sendImage(file: File) {
    if (!activeId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        await send(draft, data.url); // attach current draft text (if any) with the image
        setDraft("");
      } else {
        alert(data.message || "آپلود عکس ناموفق بود");
      }
    } finally {
      setUploading(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Conversation list */}
      <div className={`w-full sm:w-72 border-l border-surface2 overflow-y-auto ${activeId ? "hidden sm:block" : ""}`}>
        <div className="p-3 font-bold text-sm border-b border-surface2">چت‌ها</div>
        {conversations.length === 0 && <p className="text-xs text-muted p-4">هنوز گفتگویی ندارید.</p>}
        {conversations.map((c) => {
          const otherName = c.starter.id === myId ? c.listing.author.name : c.starter.name;
          const last = c.messages[0];
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-right p-3 border-b border-surface2 hover:bg-surface2 transition ${activeId === c.id ? "bg-surface2" : ""}`}
            >
              <div className="text-xs font-bold">{c.listing.title}</div>
              <div className="text-[11px] text-muted mt-0.5">با {otherName}</div>
              {last && <div className="text-[11px] text-muted mt-1 truncate">{last.content || "📷 عکس"}</div>}
            </button>
          );
        })}
      </div>

      {/* Active thread */}
      <div className={`flex-1 flex flex-col ${!activeId ? "hidden sm:flex" : ""}`}>
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">یک گفتگو را انتخاب کنید</div>
        ) : (
          <>
            <div className="p-3 border-b border-surface2 flex items-center gap-2">
              <button onClick={() => setActiveId(null)} className="sm:hidden text-muted">→</button>
              <div className="text-sm font-bold">{active.listing.title}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${m.senderId === myId ? "bg-copper text-[#1A1410] mr-auto" : "bg-surface2 ml-auto"}`}>
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noreferrer" className="block mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.imageUrl} alt="" className="max-h-48 rounded-lg" />
                    </a>
                  )}
                  {m.content}
                  <div className="text-[9px] opacity-70 mt-1">{new Date(m.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Canned quick replies */}
            <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
              {CANNED_MESSAGES.map((c) => (
                <button key={c} onClick={() => send(c)}
                  className="whitespace-nowrap text-[11px] bg-surface2 border border-surface2 hover:border-copper rounded-full px-3 py-1.5 transition-colors">
                  {c}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-surface2 flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) sendImage(f);
                  e.target.value = "";
                }}
              />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                title="ارسال عکس"
                className="bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                {uploading ? "⏳" : "📷"}
              </button>
              <input
                className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
                placeholder="پیام بنویسید..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button onClick={() => send()} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4">ارسال</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
