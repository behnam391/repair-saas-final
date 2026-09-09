import { notFound } from "next/navigation";
import { isIndustryKey } from "@/lib/industry-workspaces";
import IndustryDashboard from "@/components/IndustryDashboard";
import { requireDeskSession } from "@/lib/tenant";
import { db } from "@/lib/db";
import { parseShopServices } from "@/lib/shop-services";
import { INDUSTRY_WORKSPACES } from "@/lib/industry-workspaces";
import { redirect } from "next/navigation";
export default async function Page({ params }: { params: { industry: string } }) {
  if (!isIndustryKey(params.industry)) notFound();
  const { shopId } = await requireDeskSession();
  const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId }, select: { serviceCategories: true } });
  if (!parseShopServices(shop.serviceCategories).includes(INDUSTRY_WORKSPACES[params.industry].category)) redirect("/industry-workspaces");
  return <IndustryDashboard industry={params.industry}/>;
}
