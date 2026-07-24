"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LogoMark } from "./Logo";

type NavItem = { href: string; label: string; icon: string; external?: boolean };
type NavGroup = { label: string; items: NavItem[] };

export default function DashboardNav({
  role,
  guideUrl,
  shopType,
  shopName,
  userName,
}: {
  role: string;
  guideUrl: string | null;
  shopType?: string;
  shopName?: string;
  userName?: string;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Portal target only exists client-side; also, the drawer MUST be portaled
  // to <body>: the glass header's backdrop-filter turns the header into the
  // containing block for fixed-position descendants, which would trap and
  // clip a fixed overlay inside the header box.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideMenu = (e.target as HTMLElement)?.closest?.("[data-nav-menu]");
      if (!insideContainer && !insideMenu) setOpenGroup(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function toggleGroup(label: string) {
    if (openGroup === label) { setOpenGroup(null); return; }
    const btn = btnRefs.current[label];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpenGroup(label);
  }

  const groups: NavGroup[] = [
    {
      label: "عملیات",
      items: [
        { href: "/inventory", label: "انبار قطعات", icon: "📦" },
        { href: "/sales", label: "فروش مستقیم", icon: "🛒" },
        { href: "/invoices", label: "فاکتورها", icon: "🧾" },
        { href: "/returns", label: "مرجوعی", icon: "🔁" },
        { href: "/pending-intakes", label: "پذیرش QR", icon: "🔳" },
      ],
    },
    {
      label: "ارتباطات",
      items: [
        { href: "/market", label: "بازار سراسری", icon: "🌐" },
        { href: "/chats", label: "چت‌ها", icon: "💬" },
        { href: "/device-lookup", label: "پرونده گوشی", icon: "🔎" },
        { href: "/collaboration", label: "همکاری مغازه‌ها", icon: "🤝" },
      ],
    },
    {
      label: "مشتریان",
      items: [
        { href: "/customers", label: "دفترچه مشتریان", icon: "👥" },
        { href: "/history", label: "سابقه و جستجو", icon: "🕘" },
      ],
    },
    {
      label: "من",
      items: [
        { href: "/profile", label: "پروفایل من", icon: "👤" },
        { href: "/support", label: "پشتیبانی", icon: "🎧" },
        ...(guideUrl ? [{ href: guideUrl, label: "راهنمای سایت", icon: "📘", external: true }] : []),
        { href: "/about", label: "درباره ما", icon: "ℹ️" },
      ],
    },
    ...(role === "OWNER"
      ? [{
          label: "مدیریت",
          items: [
            { href: "/admin", label: "پنل مدیریت", icon: "📊" },
            { href: "/admin/billing", label: "اشتراک و پرداخت", icon: "💳" },
          ],
        }]
      : []),
  ];

  const activeGroup = groups.find((g) => g.label === openGroup);
  const showDealer = shopType === "DEALER" || shopType === "BOTH";

  return (
    <>
      {/* ── Mobile (below md): quick pills + «منو» opening a Telegram-style
          side drawer. */}
      <div className="flex md:hidden items-center gap-1.5 w-full order-last pt-1">
        <button
          onClick={() => setMobileOpen(true)}
          className="bg-surface2 border border-border text-ink font-bold rounded-full px-3.5 py-1.5 text-xs"
        >
          ☰ منو
        </button>
        <div className="flex items-center gap-1.5 ms-auto">
          <Link href="/tickets" className="bg-copper/15 text-copper font-bold rounded-full px-3 py-1.5 whitespace-nowrap text-xs">
            🏠 صفحه اصلی
          </Link>
          {showDealer && (
            <Link href="/dealer" className="bg-teal/15 text-teal font-bold rounded-full px-3 py-1.5 whitespace-nowrap text-xs">
              💰 خرید و فروش
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[300] md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/55 drawer-fade" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="nav-sheet drawer-enter absolute inset-y-0 right-0 w-[80vw] max-w-[320px] overflow-y-auto rounded-l-3xl"
          >
            {/* Profile header — like Telegram's drawer top. */}
            <div className="drawer-head px-4 pt-5 pb-4 rounded-tl-3xl">
              <div className="bg-white/95 rounded-2xl w-12 h-12 flex items-center justify-center shadow-lg">
                <LogoMark size={30} />
              </div>
              <div className="mt-3 font-extrabold text-white text-sm">{shopName ?? "Peyvo"}</div>
              <div className="text-white/85 text-[11px] mt-0.5">{userName ?? ""}</div>
            </div>

            {/* Quick actions */}
            <nav className="py-1.5">
              <DrawerRow href="/tickets" icon="🏠" label="صفحه اصلی" onGo={() => setMobileOpen(false)} bold />
              {showDealer && (
                <DrawerRow href="/dealer" icon="💰" label="خرید و فروش" onGo={() => setMobileOpen(false)} bold />
              )}

              {groups.map((g) => (
                <div key={g.label}>
                  <div className="h-px bg-border mx-4 my-1.5" />
                  <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold text-muted">{g.label}</div>
                  {g.items.map((item) => (
                    <DrawerRow
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      external={item.external}
                      onGo={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        </div>,
        document.body
      )}

      {/* ── Desktop (md+): unchanged — centered pills with dropdown groups. */}
      <div ref={containerRef} className="hidden md:flex items-center gap-1 flex-1 justify-center flex-wrap">
        <Link href="/tickets" className="bg-copper/15 text-copper font-bold rounded-full px-3 py-1 whitespace-nowrap text-xs">
          🏠 صفحه اصلی
        </Link>
        {showDealer && (
          <Link href="/dealer" className="bg-teal/15 text-teal font-bold rounded-full px-3 py-1 whitespace-nowrap text-xs">
            💰 خرید و فروش
          </Link>
        )}

        {groups.map((g) => (
          <button
            key={g.label}
            ref={(el) => { btnRefs.current[g.label] = el; }}
            onClick={() => toggleGroup(g.label)}
            className={`text-xs font-bold rounded-lg px-2.5 py-1.5 whitespace-nowrap transition border-b-2 ${
              openGroup === g.label ? "bg-surface2 text-ink border-copper" : "text-ink hover:bg-surface2 border-transparent"
            }`}
          >
            {g.label} ▾
          </button>
        ))}
      </div>

      {/* Rendered at the body level so it's never clipped or trapped by the
          glass header's backdrop-filter containing block. */}
      {activeGroup && menuPos && mounted && createPortal(
        <div
          data-nav-menu
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
          className="bg-surface border border-surface2 rounded-xl shadow-lg py-1.5 min-w-[170px] z-[200]"
        >
          {activeGroup.items.map((item) =>
            item.external ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer"
                onClick={() => setOpenGroup(null)}
                className="block px-3 py-2 text-xs text-muted hover:bg-surface2 hover:text-ink whitespace-nowrap">
                {item.icon} {item.label} ↗
              </a>
            ) : (
              <Link key={item.href} href={item.href} onClick={() => setOpenGroup(null)}
                className="block px-3 py-2 text-xs text-muted hover:bg-surface2 hover:text-ink whitespace-nowrap">
                {item.icon} {item.label}
              </Link>
            )
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/* One flat Telegram-style drawer row: icon bubble + label. */
function DrawerRow({
  href,
  icon,
  label,
  onGo,
  external,
  bold,
}: {
  href: string;
  icon: string;
  label: string;
  onGo: () => void;
  external?: boolean;
  bold?: boolean;
}) {
  const cls = `flex items-center gap-3 px-4 py-2.5 text-[13px] active:bg-surface2 ${bold ? "font-bold" : ""}`;
  const inner = (
    <>
      <span className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-[15px] shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {external && <span className="text-muted text-[10px]">↗</span>}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onGo} className={cls}>{inner}</a>
  ) : (
    <Link href={href} onClick={onGo} className={cls}>{inner}</Link>
  );
}
