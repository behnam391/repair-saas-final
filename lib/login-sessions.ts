import type { LoginSubjectKind, Prisma } from "@prisma/client";
import { db } from "./db";

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const TOUCH_INTERVAL_MS = 60_000;

type RequestLike = { headers?: Headers | Record<string, string | string[] | undefined> } | undefined;

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const sanitized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  return sanitized || undefined;
}

function readHeader(req: RequestLike, name: string): string | undefined {
  const headers = req?.headers;
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name) ?? undefined;
  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function getLoginRequestMetadata(req: RequestLike) {
  const forwarded = readHeader(req, "x-forwarded-for")?.split(",")[0];
  return {
    ipAddress: clean(forwarded || readHeader(req, "x-real-ip"), 64),
    userAgent: clean(readHeader(req, "user-agent"), 512),
  };
}

export function getDeviceLabel(userAgent?: string | null) {
  const ua = userAgent ?? "";
  const app = /PeyvoNativeApp/i.test(ua);
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const windows = /Windows/i.test(ua);
  const browser = /Edg\//i.test(ua) ? "Edge" : /Firefox\//i.test(ua) ? "Firefox" :
    /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "مرورگر";
  if (app) return "اپلیکیشن اندروید پیوو";
  if (android) return `اندروید · ${browser}`;
  if (ios) return `آیفون/آیپد · ${browser}`;
  if (windows) return `ویندوز · ${browser}`;
  return ua ? browser : "دستگاه نامشخص";
}

export async function createLoginSession(input: {
  subjectKind: LoginSubjectKind;
  subjectId: string;
  roleAtLogin?: string | null;
  nameAtLogin: string;
  phoneAtLogin: string;
  shopId?: string | null;
  shopNameAtLogin?: string | null;
  provider: string;
  request?: RequestLike;
}) {
  const now = new Date();
  const metadata = getLoginRequestMetadata(input.request);
  return db.loginSession.create({
    data: {
      subjectKind: input.subjectKind,
      subjectId: input.subjectId,
      roleAtLogin: input.roleAtLogin ?? null,
      nameAtLogin: clean(input.nameAtLogin, 160) ?? "کاربر",
      phoneAtLogin: clean(input.phoneAtLogin, 32) ?? "-",
      shopId: input.shopId ?? null,
      shopNameAtLogin: clean(input.shopNameAtLogin, 180) ?? null,
      provider: input.provider,
      ...metadata,
      expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000),
    },
    select: { id: true },
  });
}

export async function validateAndTouchLoginSession(input: {
  id: string;
  subjectId: string;
  subjectKind: LoginSubjectKind;
}) {
  const now = new Date();
  const record = await db.loginSession.findUnique({ where: { id: input.id } });
  if (!record || record.subjectId !== input.subjectId || record.subjectKind !== input.subjectKind ||
      record.revokedAt || record.loggedOutAt || record.expiresAt <= now) return false;
  if (now.getTime() - record.lastActivityAt.getTime() >= TOUCH_INTERVAL_MS) {
    await db.loginSession.updateMany({
      where: { id: input.id, revokedAt: null, loggedOutAt: null, expiresAt: { gt: now } },
      data: {
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000),
      },
    });
  }
  return true;
}

export async function markLoginSessionLoggedOut(id?: string | null) {
  if (!id) return;
  await db.loginSession.updateMany({
    where: { id, loggedOutAt: null, revokedAt: null },
    data: { loggedOutAt: new Date() },
  });
}

export async function revokeSessionsForSubject(
  subjectKind: LoginSubjectKind,
  subjectId: string,
  options: { exceptId?: string; adminId?: string; reason?: string } = {},
) {
  const where: Prisma.LoginSessionWhereInput = {
    subjectKind,
    subjectId,
    revokedAt: null,
    loggedOutAt: null,
    expiresAt: { gt: new Date() },
  };
  if (options.exceptId) where.id = { not: options.exceptId };
  return db.loginSession.updateMany({
    where,
    data: {
      revokedAt: new Date(),
      revokedByAdminId: options.adminId ?? null,
      revokedReason: options.reason ?? "SECURITY_CHANGE",
    },
  });
}

export async function revokeSessionsForShop(shopId: string, adminId?: string, reason = "SHOP_DISABLED") {
  return db.loginSession.updateMany({
    where: { shopId, revokedAt: null, loggedOutAt: null, expiresAt: { gt: new Date() } },
    data: { revokedAt: new Date(), revokedByAdminId: adminId ?? null, revokedReason: reason },
  });
}
