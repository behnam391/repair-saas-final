"use client";
/**
 * Liquid ("melting") bottom navigation.
 *
 * How the melt works: the bar and the active-tab blob are drawn in one
 * layer that carries an SVG gooey filter (blur → alpha contrast), so two
 * shapes that come close visually fuse into one. A second blob trails the
 * first with a much softer spring, so while the indicator travels the two
 * blobs are apart and the goo stretches a liquid neck between them; when
 * the springs settle they overlap and read as a single drop again.
 * Velocity also squashes the leading blob (wider + flatter the faster it
 * moves), which is what sells it as liquid rather than a sliding circle.
 *
 * Labels and icons are rendered in a SEPARATE unfiltered layer on top —
 * pushing text through the goo filter would smear it.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import {
  BarChart3,
  Globe,
  Home,
  MessageSquare,
  Package,
  Receipt,
  Search,
  Star,
  Store,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { isTechnician } from "@/lib/permissions";

const BLOB = 52;
const SPRING = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.9 };

type Item = { href: string; label: string; Icon: LucideIcon };

/* ── Shop dashboard ──────────────────────────────────────────── */
export function ShopBottomNav({ role }: { role: string }) {
  const items = useMemo<Item[]>(() => {
    if (isTechnician(role)) {
      // Technicians have no money/inventory access — give them the board,
      // chats, the parts market, device lookup and their profile.
      return [
        { href: "/tickets", label: "تعمیرها", Icon: Wrench },
        { href: "/chats", label: "چت‌ها", Icon: MessageSquare },
        { href: "/market", label: "بازار", Icon: Globe },
        { href: "/device-lookup", label: "پرونده", Icon: Search },
        { href: "/profile", label: "پروفایل", Icon: User },
      ];
    }
    if (role === "FRONTDESK") {
      return [
        { href: "/tickets", label: "تعمیرها", Icon: Home },
        { href: "/customers", label: "مشتریان", Icon: Users },
        { href: "/inventory", label: "انبار", Icon: Package },
        { href: "/invoices", label: "فاکتورها", Icon: Receipt },
        { href: "/chats", label: "چت‌ها", Icon: MessageSquare },
      ];
    }
    return [
      { href: "/tickets", label: "تعمیرها", Icon: Home },
      { href: "/customers", label: "مشتریان", Icon: Users },
      { href: "/inventory", label: "انبار", Icon: Package },
      { href: "/chats", label: "چت‌ها", Icon: MessageSquare },
      { href: "/admin", label: "مدیریت", Icon: BarChart3 },
    ];
  }, [role]);

  return <LiquidBottomNav items={items} />;
}

/* ── Customer panel ──────────────────────────────────────────── */
export function CustomerBottomNav() {
  const items = useMemo<Item[]>(
    () => [
      { href: "/customer", label: "مغازه‌ها", Icon: Store },
      { href: "/customer/repairs", label: "تعمیرهای من", Icon: Wrench },
      { href: "/customer/ratings", label: "امتیازها", Icon: Star },
      { href: "/customer/profile", label: "پروفایل", Icon: User },
    ],
    []
  );
  return <LiquidBottomNav items={items} />;
}

/* ── The nav itself ──────────────────────────────────────────── */
export function LiquidBottomNav({ items }: { items: Item[] }) {
  const pathname = usePathname() || "";
  const reduce = useReducedMotion();

  // Longest matching href wins, so /customer/repairs doesn't also light up
  // /customer.
  const activeIndex = useMemo(() => {
    let best = -1;
    let bestLen = -1;
    items.forEach((it, i) => {
      const hit = pathname === it.href || pathname.startsWith(it.href + "/");
      if (hit && it.href.length > bestLen) {
        best = i;
        bestLen = it.href.length;
      }
    });
    return best;
  }, [pathname, items]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const lead = useSpring(0, { stiffness: 420, damping: 34, mass: 0.9 });
  // The trail must lag enough to stretch a neck, but not so much that the two
  // blobs drift past the goo's fusion radius and read as two separate dots.
  const trail = useSpring(0, { stiffness: 260, damping: 24, mass: 1.05 });
  const blobOpacity = useMotionValue(0);

  // Velocity → squash & stretch. Fast travel = wider and flatter.
  const velocity = useVelocity(lead);
  const scaleX = useTransform(velocity, (v: number) => 1 + Math.min(Math.abs(v) / 2400, 0.5));
  const scaleY = useTransform(velocity, (v: number) => 1 - Math.min(Math.abs(v) / 6200, 0.24));

  const measure = useCallback(
    (instant: boolean) => {
      const wrap = wrapRef.current;
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!wrap || !el) {
        blobOpacity.set(0);
        return;
      }
      const w = wrap.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const x = r.left - w.left + r.width / 2 - BLOB / 2;
      if (instant || reduce) {
        jump(lead, x);
        jump(trail, x);
      } else {
        lead.set(x);
        trail.set(x);
      }
      blobOpacity.set(1);
    },
    [activeIndex, reduce, lead, trail, blobOpacity]
  );

  // First paint: snap into place (no slide-in from the corner).
  const firstRun = useRef(true);
  useLayoutEffect(() => {
    measure(firstRun.current);
    firstRun.current = false;
  }, [measure]);

  // Re-snap on resize / orientation change.
  //
  // Set up ONCE and read `measure` through a ref. Re-creating the observer on
  // every tab change would be a bug: `observe()` fires the callback
  // immediately, so a fresh observer would jump the blob to its new home the
  // instant the route changed — killing the melt before it started.
  const measureRef = useRef(measure);
  measureRef.current = measure;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let initial = true;
    const ro = new ResizeObserver(() => {
      // Skip the synthetic first callback that `observe()` always emits.
      if (initial) { initial = false; return; }
      measureRef.current(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="peyvo-bnav-wrap no-print md:hidden">
      {/* Filter definition. width/height 0 keeps it out of layout. */}
      <svg aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="peyvo-goo" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            {/* Alpha ramp: soft blurred edges snap back to a hard edge, which
                is what fuses two nearby shapes into one silhouette. */}
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
              result="goo"
            />
            {/* Crisp originals back on top: sharp bar + sharp blob, gooey neck. */}
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="peyvo-bnav" ref={wrapRef}>
        <div className="peyvo-bnav-shadow" />

        <div className="peyvo-bnav-liquid">
          <div className="peyvo-bnav-bar" />
          <motion.div
            className="peyvo-bnav-blob is-trail"
            style={{ x: trail, opacity: blobOpacity }}
            aria-hidden="true"
          />
          {/* No `reduce ?` branch on style — that would emit different inline
              styles on the server and the client and break hydration. With
              reduced motion the blob is jumped rather than sprung, so its
              velocity stays at zero and both scales sit at exactly 1 anyway. */}
          <motion.div
            className="peyvo-bnav-blob"
            style={{ x: lead, scaleX, scaleY, opacity: blobOpacity }}
            aria-hidden="true"
          />
        </div>

        <div className="peyvo-bnav-ring" />

        <nav className="peyvo-bnav-items" aria-label="ناوبری اصلی">
          {items.map((it, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={it.href}
                href={it.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                aria-current={active ? "page" : undefined}
                aria-label={it.label}
                className={`peyvo-bnav-item ${active ? "is-active" : ""}`}
              >
                <motion.span
                  initial={false}
                  animate={{ y: active ? -21 : 0, scale: active ? 1.05 : 1 }}
                  transition={SPRING}
                  className={active ? "text-white" : ""}
                  style={{ display: "block" }}
                >
                  <it.Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                </motion.span>
                <motion.span
                  className="peyvo-bnav-label"
                  initial={false}
                  animate={{ opacity: active ? 1 : 0, y: active ? 0 : 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {it.label}
                </motion.span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* Set a spring's value with no animation (used on mount and resize).
   `jump` exists on framer-motion 11 motion values; the fallback keeps this
   safe if the API ever moves. */
function jump(mv: MotionValue<number>, v: number) {
  const anyMv = mv as unknown as { jump?: (n: number) => void };
  if (typeof anyMv.jump === "function") anyMv.jump(v);
  else mv.set(v);
}
