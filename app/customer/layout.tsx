import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerLogoutButton from "@/components/CustomerLogoutButton";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isCustomer) redirect("/customer/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface2 sticky top-0 bg-bg/90 backdrop-blur z-20 px-4 py-3 flex items-center justify-between">
        <div className="display-heading text-sm">پنل مشتریان — {user.name}</div>
        <CustomerLogoutButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
