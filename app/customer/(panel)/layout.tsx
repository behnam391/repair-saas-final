import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";
import { CustomerBottomNav } from "@/components/BottomNav";
import Logo from "@/components/Logo";
import PanelLanguageSwitcher from "@/components/PanelLanguageSwitcher";
import { PanelI18nProvider, type PanelLocale } from "@/lib/panel-i18n";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Customer-panel shell. Guards every page in this group: only a signed-in
// PlatformCustomer session gets through — shop staff and platform admins
// are bounced to the customer login (their sessions don't carry isCustomer).
export default async function CustomerPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isCustomer || user.disabled) redirect("/customer/login");
  const headerLocale = headers().get("x-peyvo-locale");
  const initialLocale: PanelLocale = headerLocale === "en" || headerLocale === "ar" ? headerLocale : "fa";

  return <PanelI18nProvider initialLocale={initialLocale}>
    <div className="customer-shell min-h-screen">
      <header className="customer-topbar sticky top-0 z-20 px-4 py-3">
        <div className="customer-topbar-inner flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <Logo size={30} />
            <div className="min-w-0">
              <div className="customer-panel-label truncate">پنل مشتری</div>
              <div className="customer-panel-user truncate">خوش آمدید، {user.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2"><PanelLanguageSwitcher /><CustomerNav userName={user.name} /></div>
        </div>
      </header>
      <main className="customer-main page-enter pb-[96px] md:pb-0">{children}</main>
      <CustomerBottomNav />
    </div>
  </PanelI18nProvider>;
}
