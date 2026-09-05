"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { LogoMark } from "./Logo";
import { LogOut, Menu, Star, Store, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { usePanelI18n } from "@/lib/panel-i18n";

const LINKS = [
  { href: "/customer", label: "مغازه‌ها", Icon: Store },
  { href: "/customer/repairs", label: "تعمیرهای من", Icon: Wrench },
  { href: "/customer/ratings", label: "امتیازهای من", Icon: Star },
  { href: "/customer/profile", label: "پروفایل", Icon: UserRound },
] satisfies { href: string; label: string; Icon: LucideIcon }[];

export default function CustomerNav({ userName }: { userName?: string }) {
  const { t } = usePanelI18n();
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
      {/* Mobile: menu button (right) + theme toggle. Desktop: inline links. */}
      <div className="flex md:hidden items-center gap-2 order-last w-full pt-1">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-surface2 border border-border text-ink font-bold rounded-full px-3.5 py-1.5 text-xs"
        >
          <Menu size={16} /> {t("منو")}
        </button>
        <div className="ms-auto"><ThemeToggle /></div>
      </div>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[300] md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/55 drawer-fade" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="nav-sheet drawer-enter absolute inset-y-0 right-0 w-[80vw] max-w-[320px] overflow-y-auto rounded-l-3xl"
          >
            <div className="drawer-head px-4 pt-5 pb-4 rounded-tl-3xl">
              <div className="bg-white/95 rounded-2xl w-12 h-12 flex items-center justify-center shadow-lg">
                <LogoMark size={30} />
              </div>
              <div className="mt-3 font-extrabold text-white text-sm">{t("پنل مشتری")} Peyvo</div>
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
                  <span className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-[15px] shrink-0"><l.Icon size={17} /></span>
                  <span className="flex-1">{t(l.label)}</span>
                </a>
              ))}
              <div className="h-px bg-border mx-4 my-2" />
              <button
                onClick={() => signOut({ callbackUrl: "/customer/login" })}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-danger"
              >
                <span className="w-8 h-8 rounded-xl bg-danger/15 flex items-center justify-center text-[15px] shrink-0"><LogOut size={17} /></span>
                <span className="flex-1 text-start">{t("خروج از حساب")}</span>
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
            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs rounded-lg px-3 py-1.5 transition-colors ${
              isActive(l.href) ? "bg-copper text-white font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <l.Icon size={15} /> {t(l.label)}
          </a>
        ))}
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/customer/login" })}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-danger rounded-lg px-2 py-1.5"
          title={t("خروج")}
        >
          <LogOut size={15} /> {t("خروج")}
        </button>
      </div>
    </>
  );
}
