import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const shop = await db.shop.create({
    data: { name: "موبایل سرویس تهران", plan: "free", monthlyQuota: 10 },
  });

  const passwordHash = await bcrypt.hash("123456", 10);

  const owner = await db.user.create({
    data: { shopId: shop.id, name: "مدیر", phone: "09120000000", passwordHash, role: "OWNER" },
  });
  await db.user.create({
    data: { shopId: shop.id, name: "رضا", phone: "09120000001", passwordHash, role: "HARDWARE" },
  });
  await db.user.create({
    data: { shopId: shop.id, name: "سینا", phone: "09120000002", passwordHash, role: "SOFTWARE" },
  });

  const customer = await db.customer.create({
    data: { shopId: shop.id, name: "علی رضایی", phone: "09351234567" },
  });

  await db.ticket.create({
    data: {
      shopId: shop.id,
      no: 1041,
      customerId: customer.id,
      deviceModel: "Samsung A54",
      issueInitial: "روشن نمی‌شود",
      lane: "HARDWARE",
      status: "PENDING",
      history: {
        create: [
          { lane: "HARDWARE", action: "پذیرش دستگاه", techId: owner.id, note: "روشن نمی‌شود" },
          { lane: "HARDWARE", action: "ارجاع به سخت‌افزار", techId: owner.id },
        ],
      },
    },
  });

  await db.inventoryItem.create({
    data: { shopId: shop.id, name: "LCD سامسونگ A54", quantity: 3, lowStockAt: 2, costPrice: 900000, sellPrice: 1300000 },
  });

  const techUser = await db.user.findFirstOrThrow({ where: { shopId: shop.id, role: "HARDWARE" } });
  await db.marketListing.create({
    data: {
      shopId: shop.id,
      authorId: techUser.id,
      category: "BOARD",
      title: "دنبال برد سالم آیفون 12",
      description: "برد آیفون 12 با مشکل نرم‌افزاری، دنبال یک برد سالم برای تعویض یا شماتیک تست نقاط پاور هستم.",
      deviceModel: "iPhone 12",
      province: "تهران",
      city: "تهران",
    },
  });

  await db.platformAdmin.create({
    data: { name: "صاحب سرویس", phone: "09100000000", passwordHash },
  });

  console.log("✅ Seed complete.");
  console.log("   مغازه: 09120000000 / 123456");
  console.log("   مدیریت پلتفرم (/superadmin/login): 09100000000 / 123456");
}

main().finally(() => db.$disconnect());
