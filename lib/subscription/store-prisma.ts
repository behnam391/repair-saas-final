// ── Prisma adapter of the SubscriptionStore port (production) ──
// Applies entitlement atomically and idempotently. `activate` claims the
// purchase by its unique externalRef and, in ONE transaction, reads the shop's
// current entitlement, computes the new one via the injected derive(), updates
// the Shop, and writes the PurchaseRecord. A duplicate externalRef (retry or
// concurrent callback) is resolved to "already_active" — never a double grant.

import { db } from "@/lib/db";
import type {
  ActivationOutcome,
  DeriveEntitlement,
  PurchaseRecordData,
  PurchaseStatus,
  SubscriptionStore,
  VerifiedPurchase,
} from "./types";

function toData(r: any): PurchaseRecordData {
  return {
    id: r.id,
    shopId: r.shopId,
    source: r.source,
    externalRef: r.externalRef,
    plan: r.plan,
    months: r.months,
    amountToman: r.amountToman ?? null,
    status: r.status as PurchaseStatus,
    autoRenewing: !!r.autoRenewing,
    purchasedAt: r.purchasedAt,
    expiresAt: r.expiresAt ?? null,
    raw: r.raw ?? null,
    createdAt: r.createdAt,
  };
}

function safeJson(v: unknown): string | null {
  try {
    return JSON.stringify(v).slice(0, 4000);
  } catch {
    return null;
  }
}

export class PrismaSubscriptionStore implements SubscriptionStore {
  async activate(purchase: VerifiedPurchase, derive: DeriveEntitlement): Promise<ActivationOutcome> {
    const existing = await (db as any).purchaseRecord.findUnique({ where: { externalRef: purchase.externalRef } });
    if (existing) return { status: "already_active", record: toData(existing) };

    try {
      const record = await db.$transaction(async (tx: any) => {
        const shop = await tx.shop.findUniqueOrThrow({ where: { id: purchase.shopId } });
        const applied = derive({ plan: shop.plan, planExpiresAt: shop.planExpiresAt });
        await tx.shop.update({
          where: { id: purchase.shopId },
          data: { plan: applied.plan, planExpiresAt: applied.planExpiresAt, monthlyQuota: applied.monthlyQuota },
        });
        return tx.purchaseRecord.create({
          data: {
            shopId: purchase.shopId,
            source: purchase.source,
            externalRef: purchase.externalRef,
            plan: purchase.plan,
            months: purchase.months,
            amountToman: purchase.amountToman ?? null,
            autoRenewing: purchase.autoRenewing ?? false,
            status: "ACTIVE",
            expiresAt: applied.planExpiresAt,
            purchasedAt: purchase.purchasedAt ?? new Date(),
            raw: purchase.raw != null ? safeJson(purchase.raw) : null,
          },
        });
      });
      return { status: "activated", record: toData(record) };
    } catch (e: any) {
      // Unique-constraint race: another activation won. Treat as idempotent.
      if (e?.code === "P2002") {
        const again = await (db as any).purchaseRecord.findUnique({ where: { externalRef: purchase.externalRef } });
        if (again) return { status: "already_active", record: toData(again) };
      }
      throw e;
    }
  }

  async cancel(externalRef: string): Promise<PurchaseRecordData | null> {
    const existing = await (db as any).purchaseRecord.findUnique({ where: { externalRef } });
    if (!existing) return null;
    const updated = await (db as any).purchaseRecord.update({
      where: { externalRef },
      data: { status: "CANCELLED", autoRenewing: false },
    });
    return toData(updated);
  }

  async findPurchase(externalRef: string): Promise<PurchaseRecordData | null> {
    const r = await (db as any).purchaseRecord.findUnique({ where: { externalRef } });
    return r ? toData(r) : null;
  }
}
