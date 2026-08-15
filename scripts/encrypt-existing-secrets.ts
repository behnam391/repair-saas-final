// ── One-time data migration: encrypt existing plaintext secrets & passcodes ──
// Run ONCE after deploying the Phase 1 changes and setting SECRETS_MASTER_KEY.
// Idempotent: values already encrypted (enc:v1:…) are skipped, so re-running is
// safe. It encrypts, in place:
//   • the PlatformSettings singleton's secret fields (PLATFORM_SECRET_FIELDS)
//   • every Ticket.devicePasscode
//   • every PendingIntake.devicePasscode
//
// Usage (from the project root, with DATABASE_URL + SECRETS_MASTER_KEY set):
//   npx tsx scripts/encrypt-existing-secrets.ts
//
// This does NOT run during `npm run build`; it is a manual, explicit step.

import { db } from "../lib/db";
import { encryptSecret, isEncrypted, isSecretEncryptionConfigured, PLATFORM_SECRET_FIELDS } from "../lib/crypto";

async function main() {
  if (!isSecretEncryptionConfigured()) {
    console.error("✖ SECRETS_MASTER_KEY is not set — refusing to run (nothing to encrypt with).");
    process.exit(1);
  }

  // 1) PlatformSettings secrets
  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  if (settings) {
    const data: Record<string, string> = {};
    for (const f of PLATFORM_SECRET_FIELDS) {
      const v = (settings as any)[f];
      if (typeof v === "string" && v.length > 0 && !isEncrypted(v)) {
        data[f] = encryptSecret(v);
      }
    }
    if (Object.keys(data).length > 0) {
      await db.platformSettings.update({ where: { id: "singleton" }, data: data as any });
      console.log("✔ encrypted PlatformSettings fields:", Object.keys(data).join(", "));
    } else {
      console.log("• PlatformSettings: nothing to encrypt (empty or already encrypted).");
    }
  } else {
    console.log("• PlatformSettings singleton not present — skipped.");
  }

  // 2) Ticket passcodes
  const tickets = await db.ticket.findMany({
    where: { devicePasscode: { not: null } },
    select: { id: true, devicePasscode: true },
  });
  let tCount = 0;
  for (const t of tickets) {
    if (t.devicePasscode && !isEncrypted(t.devicePasscode)) {
      await db.ticket.update({ where: { id: t.id }, data: { devicePasscode: encryptSecret(t.devicePasscode) } });
      tCount++;
    }
  }
  console.log(`✔ encrypted Ticket passcodes: ${tCount} of ${tickets.length} scanned`);

  // 3) PendingIntake passcodes
  const intakes = await db.pendingIntake.findMany({
    where: { devicePasscode: { not: null } },
    select: { id: true, devicePasscode: true },
  });
  let pCount = 0;
  for (const p of intakes) {
    if (p.devicePasscode && !isEncrypted(p.devicePasscode)) {
      await db.pendingIntake.update({ where: { id: p.id }, data: { devicePasscode: encryptSecret(p.devicePasscode) } });
      pCount++;
    }
  }
  console.log(`✔ encrypted PendingIntake passcodes: ${pCount} of ${intakes.length} scanned`);

  await db.$disconnect();
  console.log("Done.");
}

main().catch(async (e) => {
  console.error("✖ migration failed:", e);
  try {
    await db.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
