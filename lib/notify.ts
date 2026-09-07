import { db } from "./db";
import { notificationLink } from "./notification-link";

export async function notifyUser(userId: string, title: string, message: string, link?: string) {
  try {
    await db.notification.create({ data: { userId, title, message, link: notificationLink(link) } });
  } catch (e) {
    console.error("[notify] failed to create notification", e);
  }
}

export async function broadcastNotification(title: string, message: string, link?: string) {
  const users = await db.user.findMany({ where: { active: true }, select: { id: true } });
  await db.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title, message, link: notificationLink(link), isBroadcast: true })),
  });
}
