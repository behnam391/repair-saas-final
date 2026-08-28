"use client";

import { ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BellRing, Bug, ChevronDown, ChevronLeft, CircleUserRound, DatabaseBackup, Gift, Headphones, KeyRound, LayoutDashboard, LogOut, Menu, MessageCircle, MonitorSmartphone, Settings2, ShieldCheck, Store, UsersRound } from "lucide-react";
import Logo from "@/components/Logo";

const GROUPS: { label: string; items: { href: string; label: string; Icon: LucideIcon }[] }[] = [
  { label: "مدیریت", items: [
    { href: "/superadmin", label: "فروشگاه‌ها", Icon: Store },
    { href: "/superadmin/users", label: "کاربران", Icon: CircleUserRound },
    { href: "/superadmin/customers", label: "مشتریان", Icon: UsersRound },
    { href: "/superadmin/managers", label: "مدیران پلتفرم", Icon: ShieldCheck },
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
    { href: "/superadmin/profile", label: "پروفایل مدیر", Icon: CircleUserRound },
    { href: "/superadmin/sessions", label: "نشست‌ها و ورودها", Icon: MonitorSmartphone },
    { href: "/superadmin/settings", label: "تنظیمات", Icon: Settings2 },
    { href: "/superadmin/external-keys", label: "API سازمان‌ها", Icon: KeyRound },
    { href: "/superadmin/errors", label: "خطاها", Icon: Bug },
    { href: "/superadmin/maintenance", label: "نگهداری", Icon: DatabaseBackup },
  ] },
];

export default function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (href: string) => href === "/superadmin" ? pathname === href : pathname.startsWith(href);

  const currentGroup = useMemo(() => GROUPS.find(g => g.items.some(i => i.href === "/superadmin" ? pathname === i.href : pathname.startsWith(i.href)))?.label ?? GROUPS[0].label, [pathname]);
  const [openGroup, setOpenGroup] = useState(currentGroup);
  const rawAdminName = session?.user?.name?.trim() || "";
  const adminName = rawAdminName && !/^[?\s]+$/.test(rawAdminName) ? rawAdminName : "بهنام شفیعی";
  const platformRole = (session?.user as any)?.platformRole;
  const platformPermissions = String((session?.user as any)?.platformPermissions ?? "").split(",").filter(Boolean);
  const permissionFor = (href: string) => href.includes("/managers") || href.includes("/profile") ? "owner" : href.includes("/customers") ? "customers" : href.includes("/support") || href.includes("/conversations") ? "support" : href.includes("/verification") ? "verification" : href.includes("/notifications") || href.includes("/ads") || href.includes("/gift-codes") ? "marketing" : href.includes("/sessions") || href.includes("/errors") ? "sessions" : href.includes("/settings") || href.includes("/external-keys") ? "settings" : href.includes("/maintenance") ? "maintenance" : "shops";
  const canSee = (href: string) => platformRole === "OWNER" || (permissionFor(href) !== "owner" && platformPermissions.includes(permissionFor(href)));
  if (pathname === "/superadmin/login") return <>{children}</>;
  return <div className={`super-shell ${collapsed ? "is-collapsed" : ""}`}>
    <aside className="super-sidebar">
      <a href="/superadmin" className="super-brand"><div><Logo size={25} withText={false} /></div><span><b>Peyvo</b><small>Platform console</small></span></a>
      <button className="super-collapse" onClick={() => setCollapsed(v => !v)} title={collapsed ? "باز کردن منو" : "جمع کردن منو"} aria-label={collapsed ? "باز کردن منوی مدیریت" : "جمع کردن منوی مدیریت"}>{collapsed ? <Menu size={17} /> : <ChevronLeft size={17} />}</button>
      <nav>{GROUPS.map((group) => { const items=group.items.filter(item=>canSee(item.href)); if(!items.length)return null; const isOpen = openGroup === group.label; return <div className={`super-nav-group ${isOpen ? "is-open" : ""}`} key={group.label}><button type="button" className="super-nav-group-title" onClick={() => { if (collapsed) setCollapsed(false); setOpenGroup(isOpen && !collapsed ? "" : group.label); }}><span>{group.label}</span><ChevronDown size={13}/></button><div className="super-nav-items">{items.map((item) => <a key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={isActive(item.href) ? "is-active" : ""}><item.Icon size={17} /><span>{item.label}</span>{isActive(item.href) && <i />}</a>)}</div></div>;})}</nav>
      <div className="super-sidebar-profile"><CircleUserRound size={18} /><span><b>{adminName}</b><small>{platformRole === "OWNER" ? "مدیر اصلی" : "مدیر سامانه"}</small></span></div>
      <button onClick={() => signOut({ callbackUrl: "/superadmin/login" })} className="super-logout"><LogOut size={16} /><span>خروج امن</span></button>
    </aside>
    <main className="super-main">
      <div className="super-mobile-brand"><a href="/superadmin"><Logo size={23} /></a><span>مرکز مدیریت پلتفرم</span><button onClick={() => signOut({ callbackUrl: "/superadmin/login" })}><LogOut size={16} /></button></div>
      <div className="super-mobile-nav">{GROUPS.flatMap((g) => g.items).filter(item => canSee(item.href)).map((item) => <a key={item.href} href={item.href} className={isActive(item.href) ? "is-active" : ""}><item.Icon size={16} /><span>{item.label}</span></a>)}</div>
      <div className="super-page-frame">{children}</div>
    </main>
  </div>;
}
