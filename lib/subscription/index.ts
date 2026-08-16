// ── Public surface of the store-agnostic subscription core ─────
// Routes and future store adapters import from here. The default
// SubscriptionService is wired to the Prisma-backed store; tests construct
// their own service with an in-memory store.

import { SubscriptionService } from "./service";
import { PrismaSubscriptionStore } from "./store-prisma";

let singleton: SubscriptionService | null = null;

/** The production SubscriptionService (Prisma-backed). */
export function getSubscriptionService(): SubscriptionService {
  if (!singleton) singleton = new SubscriptionService(new PrismaSubscriptionStore());
  return singleton;
}

export { SubscriptionService } from "./service";
export { PrismaSubscriptionStore } from "./store-prisma";
export { WebPaymentProvider } from "./providers/web";
export { MockPaymentProvider } from "./providers/mock";
export { MyketPaymentProvider } from "./providers/myket";
export { getPaymentProvider, listPaymentSources } from "./registry";
export { resolveSku, listSkus } from "./skus";
export { deriveEntitlement } from "./entitlement";
export type {
  PaymentProvider,
  VerifiedPurchase,
  VerificationResult,
  SubscriptionStore,
  ActivationResult,
  ActivationOutcome,
  RestoreResult,
  PurchaseRecordData,
  PurchaseStatus,
  DeriveEntitlement,
  CurrentEntitlement,
  AppliedEntitlement,
} from "./types";
