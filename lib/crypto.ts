// ── Envelope encryption for secrets at rest (Phase 1 security) ──
// AES-256-GCM. The master key comes ONLY from the environment
// (SECRETS_MASTER_KEY), never from the database, so a database dump alone
// cannot reveal the plaintext. Ciphertext is self-describing with a version
// prefix so a value can be told apart from legacy plaintext:
//
//   enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
//
// SECRETS_MASTER_KEY may be a base64-encoded 32-byte key (preferred) or any
// passphrase (hashed to 32 bytes). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// This module is deliberately pure (no DB import) and never throws on the read
// path, so decrypting can be dropped in front of any existing secret read
// without a chance of taking the caller down.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.SECRETS_MASTER_KEY;
  if (!raw) return null;
  // A base64 value that decodes to exactly 32 bytes is used as-is; anything
  // else is treated as a passphrase and hashed to a 32-byte key.
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    /* not base64 — fall through to passphrase hashing */
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

/** True when a master key is configured (so encryption can actually happen). */
export function isSecretEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/** Whether a stored value is already ciphertext produced by encryptSecret(). */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Encrypt a plaintext secret. Throws if no master key is configured. */
export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) throw new Error("SECRETS_MASTER_KEY is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/**
 * Encrypt when a master key is configured; otherwise return the plaintext
 * unchanged. This lets the encryption feature be deployed BEFORE the key is
 * set without breaking writes — values simply stay plaintext (exactly as
 * today) until the key exists and the backfill script runs. Callers that must
 * guarantee encryption should gate on isSecretEncryptionConfigured() first.
 */
export function encryptSecretOrPassthrough(plain: string): string {
  return isSecretEncryptionConfigured() ? encryptSecret(plain) : plain;
}

/**
 * Decrypt a stored secret. Legacy plaintext (no prefix) is passed through
 * unchanged, so this is safe to wrap around existing reads during and after
 * migration. Never throws: on any failure (missing key, tampered value) it
 * returns "" so the dependent feature behaves as "not configured" rather than
 * crashing the request.
 */
export function decryptSecret(value: string | null | undefined): string {
  if (value == null) return "";
  if (!isEncrypted(value)) return value; // legacy plaintext — passthrough
  const key = getKey();
  if (!key) return "";
  try {
    const parts = value.slice(PREFIX.length).split(":");
    if (parts.length !== 3) return "";
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const ct = Buffer.from(parts[2], "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

// The PlatformSettings columns that hold sensitive values and are encrypted at
// rest. Kept here so the settings route, the consuming libs, and the backfill
// script all agree on one list.
export const PLATFORM_SECRET_FIELDS = [
  "kavenegarApiKey",
  "telegramBotToken",
  "zarinpalMerchantId",
  "zibalMerchant",
  "nextpayApiKey",
  "smtpPassword",
  "bazaarRsaPublicKey",
  "bazaarDynamicDiscountKey",
  "myketRsaPublicKey",
  "myketAccessToken",
  "aiApiKey",
  "aiFallbackApiKey",
] as const;

export type PlatformSecretField = (typeof PLATFORM_SECRET_FIELDS)[number];
