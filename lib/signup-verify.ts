import { db } from "./db";

// Require a recently-verified signup code for this phone. Returns true only
// if /api/auth/signup/verify-code succeeded for the phone within the code's
// 10-minute window. Used by both the shop and customer signup endpoints.
export async function isPhoneVerifiedForSignup(phone: string): Promise<boolean> {
  const rec = await db.signupVerification.findFirst({
    where: { identifier: phone, verified: true, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return !!rec;
}

// Consume (delete) all verification rows for a phone once the account is
// created, so a code can't be reused.
export async function consumeSignupVerification(phone: string): Promise<void> {
  await db.signupVerification.deleteMany({ where: { identifier: phone } });
}
