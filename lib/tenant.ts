import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export class UnauthorizedError extends Error {}

/**
 * Every API route must call this first. It throws if there's no valid
 * session, and otherwise returns the caller's shopId + role so the route
 * can scope its Prisma queries with `where: { shopId }`.
 *
 * This is the single choke point that makes the SaaS multi-tenant-safe —
 * never trust a shopId that arrives from the client/request body.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new UnauthorizedError("Not signed in");
  const user = session.user as any;
  return {
    userId: user.id as string,
    shopId: user.shopId as string,
    role: user.role as string,
    name: user.name as string,
  };
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new UnauthorizedError(`Role ${role} not permitted`);
  }
}

/**
 * For platform-owner-only routes (/api/superadmin/*). Completely separate
 * from requireSession — a shop user's session will never satisfy this,
 * and this function never returns a shopId, so it can't be misused to
 * accidentally scope a tenant query.
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isSuperAdmin) throw new UnauthorizedError("Not a platform admin");
  return { adminId: user.id as string, name: user.name as string };
}
