"use client";
/**
 * Small shared motion kit — the pieces we reuse across pages so animation
 * stays consistent instead of every screen inventing its own timing.
 *
 * Reduced motion: handled by <MotionConfig reducedMotion="user"> in
 * app/providers.tsx plus the `prefers-reduced-motion` rules in globals.css.
 * IMPORTANT — nothing in here may branch its JSX on useReducedMotion():
 * the server has no idea what the user's setting is, so a render-time branch
 * produces different markup on the server and in the browser and React throws
 * the whole page back to client rendering with a hydration error. Anything
 * motion-sensitive is expressed as props/CSS instead, which is SSR-safe.
 *
 * These are client components, but they can be dropped straight into server
 * components — children are passed through untouched.
 */
import { Children, isValidElement, useEffect, useLayoutEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

/** iOS-style ease-out — fast start, long soft landing. */
const EASE = [0.16, 1, 0.3, 1] as const;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ── Reveal: fade + rise the first time it scrolls into view ──── */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 12,
  duration = 0.5,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={`peyvo-anim ${className}`}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── RevealGroup: same thing, but children arrive one after another ──
   Each child gets wrapped in a motion element, so if the group itself is a
   grid/flex container the wrapper simply takes the child's place in it. */
export function RevealGroup({
  children,
  className = "",
  stagger = 0.06,
  delay = 0,
  y = 14,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {Children.map(children, (child, i) =>
        isValidElement(child) || child ? (
          <motion.div
            key={i}
            className="peyvo-anim"
            variants={{
              hidden: { opacity: 0, y },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
            }}
          >
            {child}
          </motion.div>
        ) : (
          child
        )
      )}
    </motion.div>
  );
}

/* ── AnimatedNumber: counts up when the tile scrolls into view ──
   The server still renders the real number, so no-JS and search engines
   see the true figure; the count-up is purely a client flourish.
   Safe for hydration: the JSX text is the real value on both sides, and the
   zeroing happens in an effect that runs after hydration commits. */
export function AnimatedNumber({
  value,
  duration = 1.1,
  locale = "fa-IR",
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  locale?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();

  const fmt = (n: number) => n.toLocaleString(locale) + suffix;

  // Start from zero before first paint so the number never flashes its
  // final value and then rewinds.
  useIsoLayoutEffect(() => {
    if (!reduce && ref.current) ref.current.textContent = fmt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    if (!inView) {
      el.textContent = fmt(0);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = fmt(Math.round(v));
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce, duration, locale, suffix]);

  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
}

/* ── Pressable: a tap/hover spring for cards and tiles ─────────────
   whileHover/whileTap add no markup of their own, so dropping them for
   reduced-motion users costs nothing at hydration time. */
export function Pressable({
  children,
  className = "",
  lift = 3,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -lift }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}
