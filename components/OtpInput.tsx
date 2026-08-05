"use client";
/**
 * Modern segmented verification-code input.
 *
 * Built on `input-otp`: one real (invisible) input keeps native behaviour —
 * paste, backspace, keyboard, and `autocomplete="one-time-code"` so Android
 * offers the SMS code straight from the notification — while the boxes you
 * see are ours to animate.
 *
 * Persian/Arabic digits typed or pasted are converted to Latin here, so a
 * user with a Farsi keyboard is never told their correct code is wrong.
 * Filling is left-to-right even on RTL pages, which is what every OTP
 * screen (bank, Snapp, …) does.
 */
import { useEffect, useRef } from "react";
import { OTPInput, type SlotProps } from "input-otp";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
// One shared implementation for the whole app — see lib/phone.ts for why
// this conversion has to happen everywhere a number is typed.
import { toLatinDigits } from "@/lib/phone";

const onlyDigits = (s: string) => toLatinDigits(s);

export default function OtpInput({
  value,
  onChange,
  length = 5,
  onComplete,
  error = false,
  errorNonce = 0,
  success = false,
  disabled = false,
  autoFocus = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  onComplete?: (v: string) => void;
  error?: boolean;
  /** Bump this on every failed attempt to replay the shake. */
  errorNonce?: number;
  success?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!error || reduce) return;
    controls.start({ x: [0, -9, 8, -6, 4, 0], transition: { duration: 0.42 } });
  }, [error, errorNonce, controls, reduce]);

  const state: SlotState = success ? "ok" : error ? "err" : "idle";

  return (
    <motion.div animate={controls} className={className}>
      <OTPInput
        value={value}
        onChange={(v) => onChange(onlyDigits(v))}
        onComplete={(v: string) => onComplete?.(onlyDigits(String(v ?? "")))}
        maxLength={length}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        textAlign="center"
        pasteTransformer={onlyDigits}
        containerClassName="flex items-center justify-center"
        render={({ slots }) => (
          <div dir="ltr" className="flex items-center gap-2">
            {slots.map((slot, i) => (
              <Slot key={i} index={i} state={state} reduce={!!reduce} {...slot} />
            ))}
          </div>
        )}
      />
    </motion.div>
  );
}

type SlotState = "idle" | "ok" | "err";

function Slot({
  char,
  isActive,
  hasFakeCaret,
  index,
  state,
  reduce,
}: SlotProps & { index: number; state: SlotState; reduce: boolean }) {
  const cls = [
    "otp-slot mono",
    isActive ? "is-active" : "",
    char ? "is-filled" : "",
    state === "ok" ? "is-ok" : "",
    state === "err" ? "is-err" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className={cls}
      initial={false}
      animate={{
        scale: reduce ? 1 : isActive ? 1.06 : 1,
        y: reduce ? 0 : isActive ? -2 : 0,
      }}
      transition={{ type: "spring", stiffness: 460, damping: 28 }}
    >
      <AnimatePresence initial={false}>
        {char !== null && (
          <motion.span
            key={char + "-" + index}
            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -10, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
            style={{ position: "absolute" }}
          >
            {char}
          </motion.span>
        )}
      </AnimatePresence>

      {hasFakeCaret && (
        <motion.div
          className="otp-caret"
          animate={reduce ? { opacity: 1 } : { opacity: [1, 1, 0, 0, 1] }}
          transition={reduce ? undefined : { duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}
