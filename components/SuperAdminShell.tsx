"use client";

import { ReactNode, useEffect, useState } from "react";
import "./super-admin-modern.css";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BellRing, Bug, ChevronDown, ChevronLeft, CircleUserRound, DatabaseBackup, Gift, Headphones, KeyRound, LayoutDashboard, LogOut, Menu, MessageCircle, MonitorSmartphone, Settings2, ShieldCheck, Store, UsersRound } from "lucide-react";
import Logo from "@/components/Logo";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import "@/app/superadmin-concept/preview.css";
import "./super-admin-live.css";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  const isActive = (href: string) => href === "/superadmin" ? pathname === href : pathname.startsWith(href);

  const rawAdminName = session?.user?.name?.trim() || "";
  const adminName = rawAdminName && !/^[?\s]+$/.test(rawAdminName) ? rawAdminName : "مدیر سامانه";
  const platformRole = (session?.user as any)?.platformRole;
  const platformPermissions = String((session?.user as any)?.platformPermissions ?? "").split(",").filter(Boolean);
  const permissionFor = (href: string) => href.includes("/managers") || href.includes("/profile") ? "owner" : href.includes("/customers") ? "customers" : href.includes("/support") || href.includes("/conversations") ? "support" : href.includes("/verification") ? "verification" : href.includes("/notifications") || href.includes("/ads") || href.includes("/gift-codes") ? "marketing" : href.includes("/sessions") || href.includes("/errors") ? "sessions" : href.includes("/settings") || href.includes("/external-keys") ? "settings" : href.includes("/maintenance") ? "maintenance" : "shops";
  const canSee = (href: string) => platformRole === "OWNER" || (permissionFor(href) !== "owner" && platformPermissions.includes(permissionFor(href)));
  if (pathname === "/superadmin/login") return <>{children}</>;
  const currentLabel = GROUPS.flatMap(g => g.items).find(i => isActive(i.href))?.label ?? "مدیریت";
  return <div className={`pc pc-live ${collapsed ? "pc-compact" : ""}`} dir="rtl">
    {mobileOpen && <button className="pc-overlay" aria-label="بستن منو" onClick={() => setMobileOpen(false)} />}
    <aside className={`pc-sidebar ${mobileOpen ? "pc-open" : ""}`}>
      <div className="pc-brand"><Logo size={35} withText={false}/><strong>Peyvo<span>مدیریت پلتفرم</span></strong><button aria-label="باز و بسته کردن منو" aria-expanded={!collapsed} onClick={() => {setCollapsed(!collapsed);setMobileOpen(false);}}><Menu size={18}/></button></div>
      <div className="pc-workspace"><span className="pc-avatar">P</span><div><b>فضای مدیریت پیوو</b><small>کنترل یکپارچه کسب‌وکار</small></div><ShieldCheck size={18}/></div>
      <nav aria-label="مدیریت پلتفرم">{GROUPS.map(group => {const items = group.items.filter(i => canSee(i.href));return items.length ? <div key={group.label}><p className="pc-group">{group.label}</p>{items.map(item => <Link key={item.href} href={item.href} title={item.label} aria-current={isActive(item.href) ? "page" : undefined} className={isActive(item.href) ? "selected" : ""}><item.Icon size={19}/><span>{item.label}</span></Link>)}</div> : null;})}</nav>
      <div className="pc-profile"><span className="pc-avatar">{adminName.slice(0,1)}</span><div><b>{adminName}</b><small>{platformRole === "OWNER" ? "مدیر اصلی" : "مدیر سامانه"}</small></div><button title="خروج امن" aria-label="خروج امن" onClick={() => signOut({callbackUrl:"/superadmin/login"})}><LogOut size={18}/></button></div>
    </aside>
    <div className="pc-work"><header className="pc-top"><div className="pc-crumb"><button className="pc-mobile-menu" aria-label="باز کردن منو" aria-expanded={mobileOpen} onClick={() => {setCollapsed(false);setMobileOpen(!mobileOpen);}}><Menu size={22}/></button><span>مدیریت پلتفرم</span><ChevronLeft size={14}/><b>{currentLabel}</b></div><div className="pc-top-actions"><ThemeToggle/><span className="pc-avatar" title={adminName}>{adminName.slice(0,1)}</span></div></header><main className="pc-main">{children}</main></div>
  </div>;
}
