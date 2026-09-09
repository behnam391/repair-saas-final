import Link from "next/link";
import { INDUSTRY_WORKSPACES } from "@/lib/industry-workspaces";
import { requireDeskSession } from "@/lib/tenant";
import { db } from "@/lib/db";
import { parseShopServices } from "@/lib/shop-services";
import EnableIndustry from "@/components/EnableIndustry";
export default async function Page() {
  const { shopId, role } = await requireDeskSession();
  const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId }, select: { serviceCategories: true } });
  const services = parseShopServices(shop.serviceCategories);
  return <><h1>زمینه‌های فعالیت تعمیرگاه</h1><p className="industry-muted">هر صنف، پذیرش و نمای اختصاصی دارد. افزودن یک صنف، اطلاعات و خدمات قبلی را تغییر نمی‌دهد. سهمیه پذیرش میان همه صنف‌های مجموعه مشترک است.</p>
    <div className="industry-directory">{Object.entries(INDUSTRY_WORKSPACES).map(([key, item]) => <section className="industry-panel" key={key}><small>{item.group}</small><h2>{item.title}</h2><p>{item.description}</p><p>{item.examples.join(" · ")}</p>{services.includes(item.category) ? <Link href={`/industry-workspaces/${key}`}>مشاهده داشبورد ←</Link> : role === "OWNER" ? <EnableIndustry industry={key}/> : <p>برای فعال‌سازی با مدیر مجموعه تماس بگیرید.</p>}</section>)}</div>
    {services.some(v => v === "MOBILE" || v === "COMPUTER") && <p className="industry-notice"><Link href="/tickets">داشبورد موبایل و کامپیوتر ←</Link></p>}</>;
}
