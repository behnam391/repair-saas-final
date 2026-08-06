import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { z } from "zod";

const secret = process.env.OTP_HASH_SECRET || process.env.NEXTAUTH_SECRET;

function otpSecret(): string {
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("OTP_HASH_SECRET or NEXTAUTH_SECRET must be configured");
  }
  return secret || "peyvo-development-only-otp-secret";
}

export function generateOtp(): string {
  return randomInt(10_000, 100_000).toString();
}

export function hashOtp(identifier: string, code: string): string {
  return createHmac("sha256", otpSecret()).update(`${identifier}:${code}`).digest("hex");
}

export function verifyOtp(identifier: string, code: string, storedHash: string): boolean {
  const expected = Buffer.from(hashOtp(identifier, code));
  const actual = Buffer.from(storedHash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const strongPassword = z.string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(128, "رمز عبور بیش از حد طولانی است")
  .regex(/[A-Za-z]/, "رمز عبور باید حداقل یک حرف داشته باشد")
  .regex(/[0-9]/, "رمز عبور باید حداقل یک عدد داشته باشد");
