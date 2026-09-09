import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { shopHome } from "@/lib/shop-services";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.disabled || user.validationUnavailable) redirect("/login");
  if (user.isCustomer) redirect("/customer");
  if (user.isSuperAdmin) redirect("/superadmin");
  if (!user.shopId) redirect("/login");
  const shop = await db.shop.findUnique({ where: { id: user.shopId }, select: { serviceCategories: true } });
  redirect(["OWNER", "FRONTDESK"].includes(user.role) ? shopHome(shop?.serviceCategories) : "/tickets");
}
