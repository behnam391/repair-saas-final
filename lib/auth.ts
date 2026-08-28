import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { normalizePhone } from "./phone";
import { LoginSubjectKind } from "@prisma/client";
import {
  createLoginSession,
  markLoginSessionLoggedOut,
  SESSION_MAX_AGE_SECONDS,
  validateAndTouchLoginSession,
} from "./login-sessions";

// Every signed-in shop user is locked to exactly one shop. The session token
// carries shopId + role so API routes can scope every query without an
// extra database round-trip. A separate "platform" provider below handles
// YOUR (the SaaS owner's) login — it never carries a shopId, so it can
// never accidentally pass a tenant-scoping check.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "shop-credentials",
      name: "credentials",
      credentials: {
        phone: { label: "شماره موبایل", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.phone || !credentials?.password) return null;

        // Normalize BEFORE the lookup. A Persian-digit phone (۰۹…) or a
        // pasted trailing space would otherwise match no row at all, and the
        // page would blame the password. See lib/phone.ts.
        const user = await db.user.findUnique({
          where: { phone: normalizePhone(credentials.phone) },
          include: { shop: true },
        });
        if (!user || !user.active) return null;
        if (!user.shop.active) return null; // suspended by platform admin

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const loginSession = await createLoginSession({
          subjectKind: LoginSubjectKind.SHOP_USER,
          subjectId: user.id,
          roleAtLogin: user.role,
          nameAtLogin: user.name,
          phoneAtLogin: user.phone,
          shopId: user.shopId,
          shopNameAtLogin: user.shop.name,
          provider: "shop-credentials",
          request,
        });

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          shopId: user.shopId,
          shopName: user.shop.name,
          loginSessionId: loginSession.id,
        } as any;
      },
    }),
    CredentialsProvider({
      id: "platform-credentials",
      name: "platform",
      credentials: {
        phone: { label: "شماره موبایل", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.phone || !credentials?.password) return null;

        const admin = await db.platformAdmin.findUnique({ where: { phone: normalizePhone(credentials.phone) } });
        if (!admin) return null;

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;

        const loginSession = await createLoginSession({
          subjectKind: LoginSubjectKind.SUPERADMIN,
          subjectId: admin.id,
          nameAtLogin: admin.name,
          phoneAtLogin: admin.phone,
          provider: "platform-credentials",
          request,
        });

        return { id: admin.id, name: admin.name, phone: admin.phone, isSuperAdmin: true, loginSessionId: loginSession.id } as any;
      },
    }),
    // Nationwide customer login — completely separate identity from shop
    // staff (User) and the platform owner (PlatformAdmin). The token never
    // carries a shopId or role, so it can never pass any tenant-scoped or
    // role-gated check; customer API routes verify `isCustomer` explicitly.
    CredentialsProvider({
      id: "customer-credentials",
      name: "customer",
      credentials: {
        phone: { label: "شماره موبایل", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.phone || !credentials?.password) return null;

        const customer = await db.platformCustomer.findUnique({ where: { phone: normalizePhone(credentials.phone) } });
        if (!customer || !customer.active) return null; // suspended by platform admin

        const valid = await bcrypt.compare(credentials.password, customer.passwordHash);
        if (!valid) return null;

        const loginSession = await createLoginSession({
          subjectKind: LoginSubjectKind.CUSTOMER,
          subjectId: customer.id,
          nameAtLogin: customer.name,
          phoneAtLogin: customer.phone,
          provider: "customer-credentials",
          request,
        });

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          isCustomer: true,
          loginSessionId: loginSession.id,
        } as any;
      },
    }),
    CredentialsProvider({
      id: "impersonation-credentials",
      name: "impersonation",
      credentials: { token: { label: "token", type: "text" } },
      async authorize(credentials, request) {
        if (!credentials?.token) return null;

        const record = await db.impersonationToken.findUnique({
          where: { token: credentials.token },
          include: { user: { include: { shop: true } } },
        });
        if (!record || record.used || record.expiresAt < new Date()) return null;
        if (!record.user.shop.supportAccessEnabled) return null; // consent may have been revoked since the link was issued

        await db.impersonationToken.update({ where: { id: record.id }, data: { used: true } });

        const loginSession = await createLoginSession({
          subjectKind: LoginSubjectKind.SHOP_USER,
          subjectId: record.user.id,
          roleAtLogin: record.user.role,
          nameAtLogin: record.user.name,
          phoneAtLogin: record.user.phone,
          shopId: record.user.shopId,
          shopNameAtLogin: record.user.shop.name,
          provider: "impersonation-credentials",
          request,
        });

        return {
          id: record.user.id,
          name: record.user.name,
          role: record.user.role,
          shopId: record.user.shopId,
          shopName: record.user.shop.name,
          isImpersonated: true,
          phone: record.user.phone,
          loginSessionId: loginSession.id,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // A fresh login is always made mutually exclusive: this browser cookie
        // belongs to exactly one of shop, customer or platform administration.
        token.isSuperAdmin = false;
        token.isCustomer = false;
        token.isImpersonated = false;
        token.role = undefined;
        token.shopId = undefined;
        token.shopName = undefined;
        token.phone = (user as any).phone;
        token.loginSessionId = (user as any).loginSessionId;
        token.sessionBlocked = false;
        token.disabled = false;
        if ((user as any).isSuperAdmin) {
          token.isSuperAdmin = true;
        } else if ((user as any).isCustomer) {
          token.isCustomer = true;
          token.phone = (user as any).phone;
        } else {
          token.role = (user as any).role;
          token.shopId = (user as any).shopId;
          token.shopName = (user as any).shopName;
          token.specialty = (user as any).specialty ?? null;
          token.isImpersonated = (user as any).isImpersonated ?? false;
        }
        return token;
      }

      // The JWT authenticates the request; this shadow row lets the platform
      // owner revoke that JWT immediately without storing the JWT itself.
      if (!token.loginSessionId || !token.sub) {
        token.sessionBlocked = true; // legacy/untracked cookie: require a clean login
      } else {
        const subjectKind = token.isSuperAdmin
          ? LoginSubjectKind.SUPERADMIN
          : token.isCustomer ? LoginSubjectKind.CUSTOMER : LoginSubjectKind.SHOP_USER;
        try {
          token.sessionBlocked = !(await validateAndTouchLoginSession({
            id: token.loginSessionId,
            subjectId: token.sub,
            subjectKind,
          }));
        } catch (e) {
          console.error("[auth] login-session validation failed", e);
          token.sessionBlocked = true;
        }
      }

      // On every SUBSEQUENT request (no fresh `user`), re-check a shop
      // user against the database. This is what makes removing/firing a
      // staff member take effect immediately — their existing session is
      // invalidated on the next request instead of surviving until the
      // JWT expires. It also lets a role or specialty change apply without
      // forcing the person to log out and back in. Wrapped so a transient
      // DB error never locks the whole team out (we keep the prior token).
      if (token.role && !token.isCustomer && !token.isSuperAdmin && token.sub) {
        try {
          const fresh = await db.user.findUnique({
            where: { id: token.sub as string },
            select: { active: true, role: true, specialty: true, shop: { select: { active: true } } },
          });
          if (!fresh || !fresh.active || !fresh.shop.active) {
            token.disabled = true;
          } else {
            token.disabled = false;
            token.role = fresh.role;
            token.specialty = fresh.specialty ?? null;
          }
        } catch (e) {
          console.error("[auth] session revalidation failed, keeping existing token", e);
        }
      }

      // Same live check for customer sessions — a suspended or deleted
      // customer loses access on their next request, not only at token
      // expiry. Wrapped so a transient DB error never locks everyone out.
      if (token.isCustomer && token.sub) {
        try {
          const fresh = await db.platformCustomer.findUnique({
            where: { id: token.sub as string },
            select: { active: true },
          });
          token.disabled = !fresh || !fresh.active;
        } catch (e) {
          console.error("[auth] customer revalidation failed, keeping existing token", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.sub;
      (session.user as any).isSuperAdmin = token.isSuperAdmin ?? false;
      (session.user as any).phone = token.phone;
      (session.user as any).isImpersonated = token.isImpersonated ?? false;
      (session.user as any).loginSessionId = token.loginSessionId;

      // A session that failed revalidation (staff removed/deactivated, shop
      // suspended, or customer suspended/deleted) is stripped of every scope
      // flag, so requireSession / requireCustomer both reject it and the app
      // treats the caller as signed out.
      if (token.disabled || token.sessionBlocked) {
        (session.user as any).isSuperAdmin = false;
        (session.user as any).isCustomer = false;
        (session.user as any).role = undefined;
        (session.user as any).shopId = undefined;
        (session.user as any).disabled = true;
        return session;
      }

      (session.user as any).isCustomer = token.isCustomer ?? false;
      (session.user as any).role = token.role;
      (session.user as any).shopId = token.shopId;
      (session.user as any).shopName = token.shopName;
      (session.user as any).specialty = token.specialty ?? null;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      try {
        await markLoginSessionLoggedOut(token?.loginSessionId);
      } catch (e) {
        // Cookie removal must still succeed even if audit storage is briefly down.
        console.error("[auth] failed to mark login session as logged out", e);
      }

      // Keep the platform owner's display name live as well. Early seed data
      // on one deployment was stored as question marks after an encoding
      // issue; repair that legacy value once and refresh the active JWT.
      if (token.isSuperAdmin && token.sub) {
        try {
          const admin = await db.platformAdmin.findUnique({ where: { id: token.sub as string }, select: { name: true } });
          if (admin) {
            const cleanName = /^[?\s]+$/.test(admin.name) ? "بهنام شفیعی" : admin.name;
            if (cleanName !== admin.name) await db.platformAdmin.update({ where: { id: token.sub as string }, data: { name: cleanName } });
            token.name = cleanName;
          }
        } catch (e) {
          console.error("[auth] platform-admin name refresh failed", e);
        }
      }
    },
  },
};
