// Hard-delete helpers for the super-admin "remove from database" tools.
// Prisma has no automatic cascade configured on these relations, so we
// delete children before parents, in one transaction (all-or-nothing).
// Used only by /api/superadmin/* — never exposed to shop users.

import { db } from "./db";

// Fully remove a shop and EVERYTHING scoped to it: staff, customers,
// tickets (+history/messages/parts), invoices, inventory, market posts and
// their chats, ratings, returns, part requests, dealer stock, expenses,
// collaboration links, subscriptions, notifications, tokens — then the shop
// row itself. Irreversible.
export async function deleteShopCascade(shopId: string) {
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
export async function deletePlatformCustomerCascade(customerId: string) {
  await db.$transaction(async (tx) => {
    await tx.rating.deleteMany({ where: { platformCustomerId: customerId } });
    await tx.customerPasswordResetToken.deleteMany({ where: { customerId } });
    await tx.platformCustomer.delete({ where: { id: customerId } });
  });
}
