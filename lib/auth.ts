import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

// Every signed-in shop user is locked to exactly one shop. The session token
// carries shopId + role so API routes can scope every query without an
// extra database round-trip. A separate "platform" provider below handles
// YOUR (the SaaS owner's) login — it never carries a shopId, so it can
// never accidentally pass a tenant-scoping check.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "shop-credentials",
      name: "credentials",
      credentials: {
        phone: { label: "شماره موبایل", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { phone: credentials.phone },
          include: { shop: true },
        });
        if (!user || !user.active) return null;
        if (!user.shop.active) return null; // suspended by platform admin

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          shopId: user.shopId,
          shopName: user.shop.name,
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
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;

        const admin = await db.platformAdmin.findUnique({ where: { phone: credentials.phone } });
        if (!admin) return null;

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, name: admin.name, isSuperAdmin: true } as any;
      },
    }),
    CredentialsProvider({
      id: "impersonation-credentials",
      name: "impersonation",
      credentials: { token: { label: "token", type: "text" } },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        const record = await db.impersonationToken.findUnique({
          where: { token: credentials.token },
          include: { user: { include: { shop: true } } },
        });
        if (!record || record.used || record.expiresAt < new Date()) return null;
        if (!record.user.shop.supportAccessEnabled) return null; // consent may have been revoked since the link was issued

        await db.impersonationToken.update({ where: { id: record.id }, data: { used: true } });

        return {
          id: record.user.id,
          name: record.user.name,
          role: record.user.role,
          shopId: record.user.shopId,
          shopName: record.user.shop.name,
          isImpersonated: true,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if ((user as any).isSuperAdmin) {
          token.isSuperAdmin = true;
        } else {
          token.role = (user as any).role;
          token.shopId = (user as any).shopId;
          token.shopName = (user as any).shopName;
          token.isImpersonated = (user as any).isImpersonated ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.sub;
      (session.user as any).isSuperAdmin = token.isSuperAdmin ?? false;
      (session.user as any).role = token.role;
      (session.user as any).shopId = token.shopId;
      (session.user as any).shopName = token.shopName;
      (session.user as any).isImpersonated = token.isImpersonated ?? false;
      return session;
    },
  },
};
