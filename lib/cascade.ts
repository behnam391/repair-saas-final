// Hard-delete helpers for the super-admin "remove from database" tools.
// Prisma has no automatic cascade configured on these relations, so we
// delete children before parents, in one transaction (all-or-nothing).
// Used only by /api/superadmin/* — never exposed to shop users.

import { db } from "./db";
import { revokeSessionsForShop, revokeSessionsForSubject } from "./login-sessions";
import { LoginSubjectKind } from "@prisma/client";

// Fully remove a shop and EVERYTHING scoped to it: staff, customers,
// tickets (+history/messages/parts), invoices, inventory, market posts and
// their chats, ratings, returns, part requests, dealer stock, expenses,
// collaboration links, subscriptions, notifications, tokens — then the shop
// row itself. Irreversible.
export async function deleteShopCascade(shopId: string, adminId?: string) {
  // LoginSession deliberately has no foreign key, so keep the history but
  // invalidate every live JWT before deleting the shop and its users.
  await revokeSessionsForShop(shopId, adminId, "SHOP_DELETED");

  const [users, tickets, invoices, items, listings, supportTickets, partnerships] = await Promise.all([
    db.user.findMany({ where: { shopId }, select: { id: true } }),
    db.ticket.findMany({ where: { shopId }, select: { id: true } }),
    db.invoice.findMany({ where: { shopId }, select: { id: true } }),
    db.inventoryItem.findMany({ where: { shopId }, select: { id: true } }),
    db.marketListing.findMany({ where: { shopId }, select: { id: true } }),
    db.supportTicket.findMany({ where: { shopId }, select: { id: true } }),
    (db as any).shopPartnership.findMany({
      where: { OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] },
      select: { id: true },
    }),
  ]);

  const userIds = users.map((u) => u.id);
  const ticketIds = tickets.map((t) => t.id);
  const invoiceIds = invoices.map((i) => i.id);
  const itemIds = items.map((i) => i.id);
  const listingIds = listings.map((l) => l.id);
  const supportIds = supportTickets.map((s) => s.id);
  const partnershipIds = (partnerships as any[]).map((p) => p.id);

  // Conversations tied to this shop's listings OR started by its users.
  const convos = await db.conversation.findMany({
    where: { OR: [{ listingId: { in: listingIds } }, { starterId: { in: userIds } }] },
    select: { id: true },
  });
  const convoIds = convos.map((c) => c.id);

  await db.$transaction(
    async (tx) => {
      // ── Market chat ──
      await tx.message.deleteMany({ where: { OR: [{ conversationId: { in: convoIds } }, { senderId: { in: userIds } }] } });
      await tx.conversation.deleteMany({ where: { id: { in: convoIds } } });
      await tx.marketReply.deleteMany({ where: { OR: [{ listingId: { in: listingIds } }, { shopId }] } });
      await tx.marketListing.deleteMany({ where: { shopId } });

      // ── Ticket / invoice / inventory children ──
      await tx.invoiceItem.deleteMany({ where: { OR: [{ invoiceId: { in: invoiceIds } }, { itemId: { in: itemIds } }] } });
      await tx.ticketPart.deleteMany({ where: { OR: [{ ticketId: { in: ticketIds } }, { itemId: { in: itemIds } }] } });
      await tx.rating.deleteMany({ where: { shopId } });
      await tx.returnRecord.deleteMany({ where: { shopId } });
      await tx.partRequest.deleteMany({ where: { shopId } });
      await tx.pendingIntake.deleteMany({ where: { shopId } });
      await tx.supportReply.deleteMany({ where: { supportTicketId: { in: supportIds } } });
      await tx.supportTicket.deleteMany({ where: { shopId } });
      await tx.invoice.deleteMany({ where: { shopId } });
      await (tx as any).ticketMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await tx.ticketHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await tx.ticket.deleteMany({ where: { shopId } });
      await tx.deviceTransaction.deleteMany({ where: { shopId } });
      await tx.deviceFlag.deleteMany({ where: { shopId } });
      await tx.inventoryItem.deleteMany({ where: { shopId } });

      // ── Shop-scoped catalog / config / finance ──
      await tx.favoriteBrand.deleteMany({ where: { shopId } });
      await tx.customDeviceModel.deleteMany({ where: { shopId } });
      await tx.issueTemplate.deleteMany({ where: { shopId } });
      await tx.referencePrice.deleteMany({ where: { shopId } });
      await tx.dealerInventory.deleteMany({ where: { shopId } });
      await (tx as any).expense.deleteMany({ where: { shopId } });
      await tx.subscription.deleteMany({ where: { shopId } });

      // ── Cross-shop collaboration ──
      await (tx as any).shopReferral.deleteMany({
        where: { OR: [{ fromShopId: shopId }, { toShopId: shopId }, { partnershipId: { in: partnershipIds } }] },
      });
      await (tx as any).shopPartnership.deleteMany({ where: { OR: [{ requestedByShopId: shopId }, { targetShopId: shopId }] } });

      // ── User-scoped rows, then users, customers, and the shop ──
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.impersonationToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { shopId } });
      await tx.customer.deleteMany({ where: { shopId } });
      await tx.shop.delete({ where: { id: shopId } });
    },
    { timeout: 30000 }
  );
}

// Remove one shop customer AND their repair history (tickets + each ticket's
// history/messages/parts, its repair invoice + items, and its rating), then the
// customer row. Scoped to shopId so a shop can only ever delete its own. Used by
// the "force" delete on the customer address book — the normal delete still
// refuses when there's history, so this only runs on explicit confirmation.
export async function deleteCustomerCascade(shopId: string, customerId: string) {
  const tickets = await db.ticket.findMany({ where: { shopId, customerId }, select: { id: true } });
  const ticketIds = tickets.map((t) => t.id);
  const invoices = await db.invoice.findMany({ where: { shopId, ticketId: { in: ticketIds } }, select: { id: true } });
  const invoiceIds = invoices.map((i) => i.id);

  await db.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await tx.rating.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await tx.ticketPart.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await (tx as any).ticketMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await tx.ticketHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await tx.ticket.deleteMany({ where: { shopId, customerId } });
    await tx.customer.deleteMany({ where: { id: customerId, shopId } });
  });
}

// Fully remove a nationwide customer account and their data.
export async function deletePlatformCustomerCascade(customerId: string, adminId?: string) {
  // Preserve the audit row while ensuring a deleted customer cannot keep an
  // already-issued JWT alive until its normal expiry.
  await revokeSessionsForSubject(LoginSubjectKind.CUSTOMER, customerId, {
    adminId,
    reason: "ACCOUNT_DELETED",
  });

  await db.$transaction(async (tx) => {
    await tx.rating.deleteMany({ where: { platformCustomerId: customerId } });
    await tx.customerPasswordResetToken.deleteMany({ where: { customerId } });
    await tx.platformCustomer.delete({ where: { id: customerId } });
  });
}

// Permanently remove one non-owner staff account without destroying the
// shop's repair, finance or audit history. Optional technician references are
// cleared; records that require an author/actor are transferred to the owner
// who confirmed the deletion. This also frees the staff phone number for a
// future account.
export async function deleteStaffCascade(shopId: string, staffId: string, replacementOwnerId: string) {
  await db.$transaction(
    async (tx) => {
      const [staff, replacement] = await Promise.all([
        tx.user.findFirst({ where: { id: staffId, shopId }, select: { id: true, role: true } }),
        tx.user.findFirst({ where: { id: replacementOwnerId, shopId, role: "OWNER", active: true }, select: { id: true } }),
      ]);
      if (!staff) throw new Error("staff_not_found");
      if (staff.role === "OWNER") throw new Error("owner_cannot_be_permanently_deleted");
      if (!replacement) throw new Error("replacement_owner_not_found");

      // Keep repair and rating records, but detach the deleted technician.
      await tx.ticket.updateMany({ where: { shopId, assignedToId: staffId }, data: { assignedToId: null } });
      await tx.ticketHistory.updateMany({ where: { techId: staffId, ticket: { shopId } }, data: { techId: null } });
      await tx.rating.updateMany({ where: { shopId, technicianId: staffId }, data: { technicianId: null } });

      // Conversations have a unique (listing, starter) key. Merge a staff
      // conversation into the owner's existing one when necessary; otherwise
      // simply transfer its ownership.
      const conversations = await tx.conversation.findMany({
        where: { starterId: staffId },
        select: { id: true, listingId: true },
      });
      for (const conversation of conversations) {
        const ownerConversation = await tx.conversation.findUnique({
          where: { listingId_starterId: { listingId: conversation.listingId, starterId: replacementOwnerId } },
          select: { id: true },
        });
        if (ownerConversation) {
          await tx.message.updateMany({ where: { conversationId: conversation.id }, data: { conversationId: ownerConversation.id } });
          await tx.conversation.delete({ where: { id: conversation.id } });
        } else {
          await tx.conversation.update({ where: { id: conversation.id }, data: { starterId: replacementOwnerId } });
        }
      }

      // Preserve authored operational records by attributing them to the
      // owner who performed the irreversible deletion.
      await tx.message.updateMany({ where: { senderId: staffId }, data: { senderId: replacementOwnerId } });
      await tx.marketListing.updateMany({ where: { shopId, authorId: staffId }, data: { authorId: replacementOwnerId } });
      await tx.marketReply.updateMany({ where: { shopId, authorId: staffId }, data: { authorId: replacementOwnerId } });
      await tx.deviceFlag.updateMany({ where: { shopId, reporterId: staffId }, data: { reporterId: replacementOwnerId } });
      await tx.deviceTransaction.updateMany({ where: { shopId, loggedById: staffId }, data: { loggedById: replacementOwnerId } });
      await tx.supportTicket.updateMany({ where: { shopId, userId: staffId }, data: { userId: replacementOwnerId } });
      await tx.partRequest.updateMany({ where: { shopId, requestedById: staffId }, data: { requestedById: replacementOwnerId } });

      await tx.notification.deleteMany({ where: { userId: staffId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: staffId } });
      await tx.impersonationToken.deleteMany({ where: { userId: staffId } });
      await tx.user.delete({ where: { id: staffId } });
    },
    { timeout: 30000 }
  );
}
