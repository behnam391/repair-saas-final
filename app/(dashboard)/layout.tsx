import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import AdBanner from "@/components/AdBanner";
import DashboardNav from "@/components/DashboardNav";
import { ShopBottomNav } from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  let guideUrl: string | null = null;
  let shopType: string | null = null;
  try {
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    guideUrl = settings?.guideUrl ?? null;
    const shop = await db.shop.findUnique({ where: { id: user.shopId }, select: { type: true } });
    shopType = shop?.type ?? null;
  } catch {}

  return (
    <div className="min-h-screen">
      <header className="glass-header app-topbar sticky top-0 z-20 px-4">
        {/* Mobile: two tiers — identity + actions on the first line, nav on its
            own swipeable line below. Desktop (md+): everything on one row. */}
        <div className="max-w-[1600px] mx-auto min-h-[70px] flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="app-brand-mark"><Logo size={25} withText={false} /></div>
            <div>
              <div className="font-extrabold text-sm leading-tight">{user.shopName}</div>
              <div className="text-[10px] text-muted mt-1 flex items-center gap-1.5"><span className="app-online-dot" />{user.name} · {roleLabel(user.role)}</div>
            </div>
          </div>
          <DashboardNav
            role={user.role}
            guideUrl={guideUrl}
            shopType={shopType ?? undefined}
            shopName={user.shopName}
            userName={`${user.name} · ${roleLabel(user.role)}`}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <NotificationBell />
            <LogoutButton />
          </div>
        </div>
        <div className="brand-underline -mx-4" />
      </header>
      {user.isImpersonated && (
        <div className="no-print bg-danger/15 border-b border-danger/40 text-danger text-xs px-4 py-2 text-center font-semibold">
          ⚠️ این نشست توسط پشتیبانی پلتفرم باز شده است — همه اقدامات ثبت می‌شود.
        </div>
      )}
      <div className="no-print"><AdBanner /></div>
      {/* Bottom padding on mobile only — that's where the floating nav sits. */}
      <main className="page-enter pb-[96px] md:pb-0">{children}</main>
      <ShopBottomNav role={user.role} />
    </div>
  );
}

function roleLabel(role: string) {
  return (
    { OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" }[role] ?? role
  );
}
