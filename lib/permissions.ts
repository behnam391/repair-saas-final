// Role-based access map. Right now this drives NAVIGATION visibility (which
// menu entries each role sees); server-side route enforcement is layered on
// separately over time. Owner always sees everything.
//
// Intent:
//   OWNER      — full shop: money, staff, reports, everything.
//   FRONTDESK  — customer- and money-facing desk: intake, customers,
//                invoices, sales, returns, QR intakes, collaboration.
//   HARDWARE / SOFTWARE / BOARD (technicians) — a repair-focused view:
//                the ticket board, market (to source parts), chats,
//                device lookup, and their own profile. No shop finances,
//                inventory management, reports, or buy/sell.

export type Role = "OWNER" | "FRONTDESK" | "HARDWARE" | "SOFTWARE" | "BOARD";

const ALL: Role[] = ["OWNER", "FRONTDESK", "HARDWARE", "SOFTWARE", "BOARD"];
const DESK: Role[] = ["OWNER", "FRONTDESK"];

// Per-destination allow-list. A destination missing from this map is
// considered universally visible (e.g. profile, support, about).
const NAV_ACCESS: Record<string, Role[]> = {
  "/tickets": ALL,
  "/dealer": DESK,
  "/inventory": DESK,
  "/sales": DESK,
  "/invoices": DESK,
  "/returns": DESK,
  "/pending-intakes": DESK,
  "/collaboration": DESK,
  "/partners": DESK,
  "/customers": DESK,
  "/history": DESK,
  "/market": ALL,
  "/chats": ALL,
  "/device-lookup": ALL,
  // Management group is already OWNER-only in the nav component:
  "/admin": ["OWNER"],
  "/reports": ["OWNER"],
  "/admin/billing": ["OWNER"],
  "/admin/wallet": ["OWNER"],
  "/expenses": ["OWNER"],
};

export function isTechnician(role?: string | null): boolean {
  return role === "HARDWARE" || role === "SOFTWARE" || role === "BOARD";
}

export function canSeeNav(role: string | undefined | null, href: string): boolean {
  if (role === "OWNER") return true;
  const allowed = NAV_ACCESS[href];
  if (!allowed) return true; // unlisted destinations are open to everyone
  return !!role && (allowed as string[]).includes(role);
}
