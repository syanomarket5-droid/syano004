import { Router, type IRouter } from "express";
import { eq, and, desc, sql, or, ne, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  conversationsTable,
  messagesTable,
  productsTable,
  sellerApplicationsTable,
} from "@workspace/db";
import { requireAuth, requireActiveAccount } from "../middlewares/auth";
import { createNotification } from "../lib/notif";

const router: IRouter = Router();

/* ── POST /conversations ─────────────────────────────────────
   Start or resume a conversation (one per customer+seller+product) */
router.post("/conversations", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  const { sellerId, productId } = req.body;

  if (!sellerId || typeof sellerId !== "number") {
    res.status(400).json({ error: "sellerId is required" });
    return;
  }

  // Determine customerId based on who is initiating
  let customerId: number;
  if (role === "customer") {
    customerId = userId;
  } else {
    res.status(403).json({ error: "Only customers can start conversations" });
    return;
  }

  if (customerId === sellerId) {
    res.status(400).json({ error: "Cannot message yourself" });
    return;
  }

  // Verify seller exists
  const [seller] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(and(eq(usersTable.id, sellerId), eq(usersTable.role, "seller")));

  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }

  // Find or create conversation using the unique index
  // COALESCE(product_id, 0) is the uniqueness key in the DB
  let conversation: typeof conversationsTable.$inferSelect | null = null;

  if (productId) {
    const [existing] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.customerId, customerId),
          eq(conversationsTable.sellerId, sellerId),
          eq(conversationsTable.productId, productId)
        )
      );
    conversation = existing ?? null;
  } else {
    const [existing] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.customerId, customerId),
          eq(conversationsTable.sellerId, sellerId),
          sql`${conversationsTable.productId} IS NULL`
        )
      );
    conversation = existing ?? null;
  }

  if (!conversation) {
    // Check if blocked
    if (productId) {
      const [blocked] = await db
        .select({ id: conversationsTable.id })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.customerId, customerId),
            eq(conversationsTable.sellerId, sellerId),
            eq(conversationsTable.productId, productId),
            eq(conversationsTable.status, "blocked")
          )
        );
      if (blocked) { res.status(403).json({ error: "Conversation has been blocked" }); return; }
    }

    const [created] = await db
      .insert(conversationsTable)
      .values({
        customerId,
        sellerId,
        productId: productId ?? null,
        status: "active",
        lastMessageAt: new Date(),
      })
      .returning();
    conversation = created;
  }

  if (conversation.status === "blocked") {
    res.status(403).json({ error: "Conversation has been blocked" });
    return;
  }

  // Get product name if applicable
  let productName: string | null = null;
  if (conversation.productId) {
    const [product] = await db
      .select({ name: productsTable.name })
      .from(productsTable)
      .where(eq(productsTable.id, conversation.productId));
    productName = product?.name ?? null;
  }

  // Get last 30 messages
  const messages = await db
    .select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      senderName: usersTable.name,
      body: messagesTable.body,
      readAt: messagesTable.readAt,
      flagged: messagesTable.flagged,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(30);

  res.json({
    conversation: {
      ...conversation,
      productName,
      sellerName: seller.name,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
    },
    messages: messages
      .reverse()
      .map((m) => ({ ...m, readAt: m.readAt?.toISOString() ?? null, createdAt: m.createdAt.toISOString() })),
  });
});

/* ── GET /conversations ──────────────────────────────────────
   List conversations for current user (customer or seller) */
router.get("/conversations", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  const whereClause =
    role === "seller"
      ? eq(conversationsTable.sellerId, userId)
      : eq(conversationsTable.customerId, userId);

  const convs = await db
    .select({
      id: conversationsTable.id,
      customerId: conversationsTable.customerId,
      sellerId: conversationsTable.sellerId,
      productId: conversationsTable.productId,
      status: conversationsTable.status,
      lastMessageAt: conversationsTable.lastMessageAt,
      createdAt: conversationsTable.createdAt,
    })
    .from(conversationsTable)
    .where(and(whereClause, sql`${conversationsTable.status} != 'archived'`))
    .orderBy(desc(conversationsTable.lastMessageAt))
    .limit(50);

  if (!convs.length) { res.json([]); return; }

  const convIds = convs.map((c) => c.id);
  const partnerIds = convs.map((c) => (role === "seller" ? c.customerId : c.sellerId));
  const uniquePartnerIds = [...new Set(partnerIds)];

  // Three queries in parallel — eliminates the previous N+1 per conversation:
  //   1. Partner names (already batched)
  //   2. Last message per conversation — DISTINCT ON (one round-trip instead of N)
  //   3. Unread count per conversation — GROUP BY (one round-trip instead of N)
  const convIdsList = sql.join(convIds.map((id) => sql`${id}`), sql`, `);
  const [partners, lastMsgResult, unreadResult] = await Promise.all([
    db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, uniquePartnerIds)),

    db.execute<{ conv_id: number; body: string; sender_id: number; created_at: string }>(
      sql`SELECT DISTINCT ON (conversation_id)
            conversation_id AS conv_id,
            body,
            sender_id,
            created_at
          FROM messages
          WHERE conversation_id IN (${convIdsList})
          ORDER BY conversation_id, created_at DESC`
    ),

    db.execute<{ conv_id: number; count: number }>(
      sql`SELECT conversation_id AS conv_id, cast(count(*) as int) AS count
          FROM messages
          WHERE conversation_id IN (${convIdsList})
            AND read_at IS NULL
            AND sender_id != ${userId}
          GROUP BY conversation_id`
    ),
  ]);

  const partnerMap = new Map(partners.map((p) => [p.id, p.name]));
  const lastMsgMap = new Map(
    (lastMsgResult.rows as Array<{ conv_id: number; body: string; sender_id: number; created_at: string }>)
      .map((r) => [Number(r.conv_id), r])
  );
  const unreadMap = new Map(
    (unreadResult.rows as Array<{ conv_id: number; count: number }>)
      .map((r) => [Number(r.conv_id), r.count])
  );

  res.json(
    convs.map((c) => {
      const partnerId = role === "seller" ? c.customerId : c.sellerId;
      const lastMsg = lastMsgMap.get(c.id) ?? null;
      return {
        id: c.id,
        customerId: c.customerId,
        sellerId: c.sellerId,
        productId: c.productId ?? null,
        status: c.status,
        partnerName: partnerMap.get(partnerId) ?? "Unknown",
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              senderId: Number(lastMsg.sender_id),
              createdAt: new Date(lastMsg.created_at).toISOString(),
            }
          : null,
        unreadCount: unreadMap.get(c.id) ?? 0,
        lastMessageAt: c.lastMessageAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      };
    })
  );
});

/* ── GET /conversations/:id/messages ────────────────────────── */
router.get("/conversations/:id/messages", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const convId = parseInt(String(req.params.id), 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const userId = req.user!.userId;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId));

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.customerId !== userId && conv.sellerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);
  const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;

  const baseWhere = eq(messagesTable.conversationId, convId);
  const whereClause = before
    ? and(baseWhere, sql`${messagesTable.id} < ${before}`)
    : baseWhere;

  const messages = await db
    .select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      senderName: usersTable.name,
      body: messagesTable.body,
      readAt: messagesTable.readAt,
      flagged: messagesTable.flagged,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(whereClause!)
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  // Mark messages from other party as read
  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        sql`${messagesTable.readAt} IS NULL`,
        ne(messagesTable.senderId, userId)
      )
    );

  res.json(
    messages
      .reverse()
      .map((m) => ({ ...m, readAt: m.readAt?.toISOString() ?? null, createdAt: m.createdAt.toISOString() }))
  );
});

/* ── POST /conversations/:id/messages ───────────────────────── */
router.post("/conversations/:id/messages", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const convId = parseInt(String(req.params.id), 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const userId = req.user!.userId;
  const { body } = req.body;

  if (!body || typeof body !== "string" || body.trim().length === 0) {
    res.status(400).json({ error: "Message body is required" });
    return;
  }
  if (body.length > 2000) {
    res.status(400).json({ error: "Message too long (max 2000 characters)" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId));

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.customerId !== userId && conv.sellerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (conv.status === "blocked") {
    res.status(403).json({ error: "This conversation has been blocked" });
    return;
  }

  // Determine recipient
  const recipientId = userId === conv.customerId ? conv.sellerId : conv.customerId;

  const [[inserted], [sender]] = await Promise.all([
    db
      .insert(messagesTable)
      .values({ conversationId: convId, senderId: userId, body: body.trim() })
      .returning(),
    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)),
  ]);

  // Update conversation last_message_at
  db.update(conversationsTable)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, convId))
    .catch(() => {});

  // Notify recipient via existing SSE notification system (no new infrastructure needed)
  createNotification({
    userId: recipientId,
    type: "new_message",
    title: "New Message",
    body: `${sender?.name ?? "Someone"}: ${body.trim().substring(0, 80)}${body.length > 80 ? "…" : ""}`,
    link: conv.customerId === recipientId ? `/messages` : `/seller/messages`,
    priority: "normal",
  }).catch(() => {});

  res.status(201).json({
    ...inserted,
    senderName: sender?.name ?? "Unknown",
    readAt: null,
    createdAt: inserted.createdAt.toISOString(),
  });
});

/* ── POST /conversations/:id/report ─────────────────────────── */
router.post("/conversations/:id/report", requireAuth, async (req, res): Promise<void> => {
  const convId = parseInt(String(req.params.id), 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const userId = req.user!.userId;
  const { messageId, reason } = req.body;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId));

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.customerId !== userId && conv.sellerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Flag the specific message (or all messages in the conversation)
  if (messageId) {
    await db
      .update(messagesTable)
      .set({ flagged: true })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.conversationId, convId)));
  }

  res.json({ reported: true, message: "Report submitted. Our team will review this conversation." });
});

export default router;
