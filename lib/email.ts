import { db } from "./db";

/**
 * Whether real email sending is possible (SMTP configured from
 * /superadmin/settings). Checked before account lookup in the
 * forgot-password flows — see isSmsConfigured for the privacy rationale.
 */
export async function isEmailConfigured() {
  try {
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    return !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPassword);
  } catch {
    return false;
  }
}

export async function sendEmail(to: string, subject: string, text: string) {
  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
    console.warn("[email] SMTP not configured — skipping real send:", { to, subject, text });
    return { ok: false, skipped: true };
  }

  // Lazy import so the app doesn't fail to build/run if nodemailer isn't
  // needed yet (e.g. before the person has installed dependencies).
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465,
    auth: { user: settings.smtpUser, pass: settings.smtpPassword },
  });

  await transporter.sendMail({
    from: settings.smtpFromAddress || settings.smtpUser,
    to,
    subject,
    text,
  });

  return { ok: true };
}
