// ── Server-side authorization capabilities (Phase 1 security) ──
// lib/permissions.ts drives NAVIGATION visibility only. This is the
// server-side counterpart: a single place that maps a capability to the roles
// allowed to perform it, plus a guard that enforces it on an API route.
//
// It is layered ON TOP of the existing requireSession/requireDeskSession/
// requireRole helpers (which stay valid) and is used to close the specific
// gaps where a money-moving mutation was reachable by any shop role. Add a new
// capability here rather than sprinkling role literals across routes.

import { requireSession, UnauthorizedError } from "./tenant";

export const CAPABILITIES = {
  "billing.write": ["OWNER"], // start/settle a subscription (incl. pay-from-wallet)
  "wallet.write": ["OWNER"], // top up / spend the shop wallet
  "staff.manage": ["OWNER"], // create/edit/remove staff
  "expenses.write": ["OWNER"], // cash-book entries
  "reports.read": ["OWNER"], // financial exports/reports
} as const;

export type Capability = keyof typeof CAPABILITIES;

/**
 * Require a valid shop session AND that the caller's role holds `cap`.
 * Returns the same shape as requireSession so routes can destructure shopId
 * etc. Throws UnauthorizedError (handled as 401 by the existing route catch
 * blocks) when the role lacks the capability.
 */
export async function requireCapability(cap: Capability) {
  const s = await requireSession();
  const allowed = CAPABILITIES[cap] as readonly string[];
  if (!allowed.includes(s.role)) {
    throw new UnauthorizedError(`Role ${s.role} lacks capability ${cap}`);
  }
  return s;
}
