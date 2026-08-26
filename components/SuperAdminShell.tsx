"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BellRing, Bug, CircleUserRound, DatabaseBackup, Gift, Headphones, KeyRound, LayoutDashboard, LogOut, MessageCircle, MonitorSmartphone, Settings2, Store, UsersRound } from "lucide-react";
import Logo from "@/components/Logo";

const GROUPS: { label: string; items: { href: string; label: string; Icon: LucideIcon }[] }[] = [
  { label: "مدیریت", items: [
    { href: "/superadmin", label: "فروشگاه‌ها", Icon: Store },
    { href: "/superadmin/users", label: "کاربران", Icon: CircleUserRound },
    { href: "/superadmin/customers", label: "مشتریان", Icon: UsersRound },
  ] },
  { label: "پشتیبانی و نظارت", items: [
    { href: "/superadmin/support", label: "پشتیبانی", Icon: Headphones },
    { href: "/superadmin/conversations", label: "نظارت بر چت‌ها", Icon: MessageCircle },
    { href: "/superadmin/verification", label: "احراز هویت", Icon: BadgeCheck },
  ] },
  { label: "بازاریابی", items: [
    { href: "/superadmin/notifications", label: "اعلان عمومی", Icon: BellRing },
    { href: "/superadmin/ads", label: "تبلیغات", Icon: LayoutDashboard },
    { href: "/superadmin/gift-codes", label: "کد هدیه", Icon: Gift },
  ] },
  { label: "سیستم", items: [
    { href: "/superadmin/sessions", label: "نشست‌ها و ورودها", Icon: MonitorSmartphone },
    { href: "/superadmin/settings", label: "تنظیمات", Icon: Settings2 },
    { href: "/superadmin/external-keys", label: "API سازمان‌ها", Icon: KeyRound },
    { href: "/superadmin/errors", label: "خطاها", Icon: Bug },
    { href: "/superadmin/maintenance", label: "نگهداری", Icon: DatabaseBackup },
  ] },
];

export default function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/superadmin/login") return <>{children}</>;
  const isActive = (href: string) => href === "/superadmin" ? pathname === href : pathname.startsWith(href);

  return <div className="super-shell">
    <aside className="super-sidebar">
      <a href="/superadmin" className="super-brand"><div><Logo size={25} withText={false} /></div><span><b>Peyvo</b><small>Platform console</small></span></a>
      <nav>{GROUPS.map((group) => <div className="super-nav-group" key={group.label}><small>{group.label}</small>{group.items.map((item) => <a key={item.href} href={item.href} className={isActive(item.href) ? "is-active" : ""}><item.Icon size={17} /><span>{item.label}</span>{isActive(item.href) && <i />}</a>)}</div>)}</nav>
      <button onClick={() => signOut({ callbackUrl: "/superadmin/login" })} className="super-logout"><LogOut size={16} /> خروج امن</button>
    </aside>
    <main className="super-main">
      <div className="super-mobile-brand"><a href="/superadmin"><Logo size={23} /></a><span>مرکز مدیریت پلتفرم</span><button onClick={() => signOut({ callbackUrl: "/superadmin/login" })}><LogOut size={16} /></button></div>
      <div className="super-mobile-nav">{GROUPS.flatMap((g) => g.items).map((item) => <a key={item.href} href={item.href} className={isActive(item.href) ? "is-active" : ""}><item.Icon size={16} /><span>{item.label}</span></a>)}</div>
      <div className="super-page-frame">{children}</div>
    </main>
  </div>;
}
