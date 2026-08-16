// ── Store-agnostic subscription core: contracts ────────────────
// The vocabulary shared between payment sources (web gateway, Cafe Bazaar,
// Myket, future stores) and the single entitlement authority
// (SubscriptionService). Store-specific verification lives ONLY behind a
// PaymentProvider; everything above the provider sees only a normalized
// VerifiedPurchase. No store SDK, API, or credential appears here.

import type { PlanKey } from "@/lib/plans";

// The normalized result of a successfully-verified purchase — the ONLY thing
// SubscriptionService consumes. `plan`/`months` are always derived server-side
// (from a Subscription row for web, or the SKU catalog for stores) — never from
// a client claim. `externalRef` is the global idempotency key.
export interface VerifiedPurchase {
  shopId: string;
  source: string; // provider key: "web" | "mock" | "bazaar" | "myket" | ...
  externalRef: string; // idempotency key, unique across all purchases
  plan: PlanKey;
  months: number;
  amountToman?: number;
  autoRenewing?: boolean;
  purchasedAt?: Date;
  providerRef?: string; // gateway refId / store order id (audit/ledger)
  raw?: unknown; // opaque provider payload (audit)
}

export type VerificationResult =
  | { ok: true; purchase: VerifiedPurchase }
  | { ok: false; reason: string };

// A payment source. Store-specific verification is fully contained here; the
// generic input type lets each adapter accept its own shape.
export interface PaymentProvider<I = unknown> {
  readonly key: string;
  verify(input: I): Promise<VerificationResult>;
}

// ── Persistence port (adapters: Prisma for prod, in-memory for tests) ──

export type PurchaseStatus = "ACTIVE" | "CANCELLED" | "REFUNDED" | "EXPIRED";

export interface PurchaseRecordData {
  id: string;
  shopId: string;
  source: string;
  externalRef: string;
  plan: string;
  months: number;
  amountToman: number | null;
  status: PurchaseStatus;
  autoRenewing: boolean;
  purchasedAt: Date;
  expiresAt: Date | null;
  raw: string | null;
  createdAt: Date;
}

export interface CurrentEntitlement {
  plan: string;
  planExpiresAt: Date | null;
}

export interface AppliedEntitlement {
  plan: PlanKey;
  planExpiresAt: Date;
  monthlyQuota: number;
}

// Pure function computed by the domain and applied atomically by the store,
// inside the same transaction that claims the purchase — so concurrent
// activations can't interleave a stale entitlement read.
export type DeriveEntitlement = (current: CurrentEntitlement | null) => AppliedEntitlement;

export type ActivationStatus = "activated" | "already_active";

export interface ActivationOutcome {
  status: ActivationStatus;
  record: PurchaseRecordData;
}

// The persistence contract. `activate` MUST be atomic and idempotent on
// `externalRef`. Only SubscriptionService calls these methods.
export interface SubscriptionStore {
  activate(purchase: VerifiedPurchase, derive: DeriveEntitlement): Promise<ActivationOutcome>;
  cancel(externalRef: string): Promise<PurchaseRecordData | null>;
  findPurchase(externalRef: string): Promise<PurchaseRecordData | null>;
}

// What SubscriptionService returns to callers (routes).
export interface ActivationResult {
  status: ActivationStatus;
  plan: PlanKey;
  months: number;
  expiresAt: Date | null;
  record: PurchaseRecordData;
}

export interface RestoreResult {
  activated: number;
  alreadyActive: number;
  results: ActivationResult[];
}
