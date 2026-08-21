// ── Payment source registry ────────────────────────────────────
// Maps a source key to a PaymentProvider. This is the only place that knows the
// set of sources; adding Cafe Bazaar / Myket / a future store later is a new
// entry here plus a new providers/*.ts file — SubscriptionService is untouched.
// (Store providers are intentionally absent in this core slice.)

import type { PaymentProvider } from "./types";
import { WebPaymentProvider } from "./providers/web";
import { MockPaymentProvider } from "./providers/mock";
import { MyketPaymentProvider } from "./providers/myket";
import { BazaarPaymentProvider } from "./providers/bazaar";

const REGISTRY: Record<string, PaymentProvider<any>> = {
  web: new WebPaymentProvider(),
  mock: new MockPaymentProvider(),
  myket: new MyketPaymentProvider(),
  bazaar: new BazaarPaymentProvider(),
};

export function getPaymentProvider(key: string): PaymentProvider<any> | null {
  return REGISTRY[key] ?? null;
}

export function listPaymentSources(): string[] {
  return Object.keys(REGISTRY);
}
