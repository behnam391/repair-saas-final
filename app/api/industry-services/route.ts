import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { INDUSTRY_WORKSPACES, isIndustryKey } from "@/lib/industry-workspaces";
import { parseShopServices, serializeShopServices } from "@/lib/shop-services";
export async function POST(request: Request) {
  try {
    const { shopId, role } = await requireDeskSession();
    if (role !== "OWNER") return NextResponse.json({ message: "فقط مدیر می‌تواند صنف اضافه کند" }, { status: 403 });
    const { industry } = await request.json();
    if (typeof industry !== "string" || !isIndustryKey(industry)) return NextResponse.json({ message: "صنف نامعتبر است" }, { status: 400 });
    await db.$transaction(async tx => {
      const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId } });
      if (!shop.active) throw new UnauthorizedError();
      await tx.shop.update({ where: { id: shopId }, data: { serviceCategories: serializeShopServices([...parseShopServices(shop.serviceCategories), INDUSTRY_WORKSPACES[industry].category]) } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: "دسترسی ندارید" }, { status: 401 });
    return NextResponse.json({ message: "فعال‌سازی انجام نشد؛ دوباره تلاش کنید" }, { status: 500 });
  }
}
