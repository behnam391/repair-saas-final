"use client";

import { useState } from "react";

// ── Peyvo AI Repair Assistant — Intake Helper (advisory UI) ──────
// A self-contained, opt-in panel inside the ticket detail modal. The technician
// explicitly requests help; the result is shown as clearly-labeled SUGGESTIONS
// with a persistent disclaimer. Nothing is applied automatically — every
// section has a manual "copy" button. If AI is off/over-quota/fails, this panel
// shows a clean message and the rest of the ticket page is unaffected.

type Suggestion = { summary: string; questions: string[]; customerExplanation: string };

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; suggestion: Suggestion; disclaimer: string }
  | { kind: "message"; message: string };

// Hetzner's reasoning models can legitimately need more than 30 seconds.
// Keep the browser deadline slightly above the server/provider deadline so
// the UI never aborts a request that is still progressing successfully.
const CLIENT_TIMEOUT_MS = 85000;

export default function AiIntakeHelper({ ticketId }: { ticketId: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState<string | null>(null);

  async function requestHelp() {
    setState({ kind: "loading" });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/ai/intake-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.suggestion) {
        setState({ kind: "done", suggestion: data.suggestion, disclaimer: data.disclaimer ?? "" });
      } else if (data?.message) {
        setState({ kind: "message", message: data.message });
      } else {
        setState({ kind: "message", message: "دریافت کمک هوش مصنوعی ناموفق بود. دوباره تلاش کنید." });
      }
    } catch (e: any) {
      setState({
        kind: "message",
        message:
          e?.name === "AbortError"
            ? "زمان پاسخ‌گویی به پایان رسید. لطفاً دوباره تلاش کنید."
            : "ارتباط با سرویس برقرار نشد. لطفاً دوباره تلاش کنید.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard may be unavailable — the text is still selectable manually */
    }
  }

  return (
    <div className="ticket-chat-block">
      <div className="ticket-section-trigger" style={{ cursor: "default" }}>
        <span>🤖 دستیار هوشمند پذیرش (پیشنهادی)</span>
        {state.kind !== "loading" && (
          <button type="button" onClick={requestHelp} className="text-xs underline decoration-dotted">
            {state.kind === "idle" ? "دریافت کمک" : "دوباره"}
          </button>
        )}
        {state.kind === "loading" && <span className="text-xs text-muted">در حال دریافت…</span>}
      </div>

      {state.kind === "message" && (
        <div className="bg-surface2/50 border border-border border-t-0 rounded-b-xl p-3 -mt-1 text-xs text-muted">
          {state.message}
        </div>
      )}

      {state.kind === "done" && (
        <div className="bg-surface2/50 border border-border border-t-0 rounded-b-xl p-3 -mt-1 space-y-3">
          <div className="text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">
            ⚠️ {state.disclaimer}
          </div>

          <Section
            label="خلاصه (پیشنهادی)"
            copyKey="summary"
            copied={copied}
            onCopy={copy}
            text={state.suggestion.summary}
          >
            <p className="text-xs whitespace-pre-wrap">{state.suggestion.summary || "—"}</p>
          </Section>

          <Section
            label="پرسش‌های تکمیلی (پیشنهادی)"
            copyKey="questions"
            copied={copied}
            onCopy={copy}
            text={state.suggestion.questions.join("\n")}
          >
            {state.suggestion.questions.length ? (
              <ul className="text-xs list-disc pr-4 space-y-1">
                {state.suggestion.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">—</p>
            )}
          </Section>

          <Section
            label="توضیح برای مشتری (پیشنهادی)"
            copyKey="explanation"
            copied={copied}
            onCopy={copy}
            text={state.suggestion.customerExplanation}
          >
            <p className="text-xs whitespace-pre-wrap">{state.suggestion.customerExplanation || "—"}</p>
          </Section>

          <p className="text-[10px] text-muted">
            برای اعمال، متن را به‌صورت دستی کپی کنید. هیچ‌چیز به‌صورت خودکار در تیکت یا پیامک ثبت نمی‌شود.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  text,
  copyKey,
  copied,
  onCopy,
  children,
}: {
  label: string;
  text: string;
  copyKey: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-muted">{label}</span>
        {text ? (
          <button type="button" onClick={() => onCopy(copyKey, text)} className="text-[10px] underline decoration-dotted">
            {copied === copyKey ? "کپی شد ✓" : "کپی"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
