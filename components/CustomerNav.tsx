"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { LogoMark } from "./Logo";

const LINKS = [
  { href: "/customer", label: "مغازه‌ها", icon: "🔍" },
  { href: "/customer/repairs", label: "تعمیرهای من", icon: "🔧" },
  { href: "/customer/ratings", label: "امتیازهای من", icon: "⭐" },
  { href: "/customer/profile", label: "پروفایل", icon: "👤" },
];

export default function CustomerNav({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) => (href === "/customer" ? pathname === "/customer" : pathname.startsWith(href));

  return (
    <>
      {/* Mobile: just a menu button (opens the drawer). Desktop: inline links. */}
      <div className="flex md:hidden items-center gap-2 order-last w-full pt-1">
        <button
          onClick={() => setOpen(true)}
          className="mr-auto bg-surface2 border border-border text-ink font-bold rounded-full px-3.5 py-1.5 text-xs"
        >
          ☰ منو
        </button>
        <ThemeToggle />
      </div>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[300] md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/55 drawer-fade" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="nav-sheet drawer-enter absolute inset-y-0 left-0 w-[80vw] max-w-[320px] overflow-y-auto rounded-r-3xl"
          >
            <div className="drawer-head px-4 pt-5 pb-4 rounded-tr-3xl">
              <div className="bg-white/95 rounded-2xl w-12 h-12 flex items-center justify-center shadow-lg">
                <LogoMark size={30} />
              </div>
              <div className="mt-3 font-extrabold text-white text-sm">پنل مشتری Peyvo</div>
              <div className="text-white/85 text-[11px] mt-0.5">{userName ?? ""}</div>
            </div>

            <nav className="py-2">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-[13px] active:bg-surface2 ${isActive(l.href) ? "font-bold text-copper" : ""}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-[15px] shrink-0">{l.icon}</span>
                  <span className="flex-1">{l.label}</span>
                </a>
              ))}
              <div className="h-px bg-border mx-4 my-2" />
              <button
                onClick={() => signOut({ callbackUrl: "/customer/login" })}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-danger"
              >
                <span className="w-8 h-8 rounded-xl bg-danger/15 flex items-center justify-center text-[15px] shrink-0">↩</span>
                <span className="flex-1 text-right">خروج از حساب</span>
              </button>
            </nav>
          </aside>
        </div>,
        document.body
      )}

      {/* Desktop inline nav */}
      <div className="hidden md:flex items-center gap-1">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap text-xs rounded-lg px-3 py-1.5 transition-colors ${
              isActive(l.href) ? "bg-copper text-white font-bold" : "text-muted hover:text-ink"
            }`}
          >
            {l.icon} {l.label}
          </a>
        ))}
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/customer/login" })}
          className="whitespace-nowrap text-xs text-danger rounded-lg px-2 py-1.5"
          title="خروج"
        >
          خروج ↩
        </button>
      </div>
    </>
  );
}
