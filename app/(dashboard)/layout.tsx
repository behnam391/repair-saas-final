import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import AdBanner from "@/components/AdBanner";
import DashboardNav from "@/components/DashboardNav";
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
      <header className="border-b border-surface2 sticky top-0 bg-bg/90 backdrop-blur z-20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="display-heading text-sm">{user.shopName}</div>
            <div className="text-[11px] text-muted">{user.name} · {roleLabel(user.role)}</div>
          </div>
          <DashboardNav role={user.role} guideUrl={guideUrl} shopType={shopType ?? undefined} />
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <NotificationBell />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="no-print"><AdBanner /></div>
      <main>{children}</main>
    </div>
  );
}

function roleLabel(role: string) {
  return (
    { OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" }[role] ?? role
  );
}
