import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    sellerId: integer("seller_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
    status: text("status").notNull().default("active"),
    lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_conversations_customer_id").on(t.customerId),
    index("idx_conversations_seller_id").on(t.sellerId),
    index("idx_conversations_last_message").on(t.sellerId, t.lastMessageAt),
  ]
);

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at"),
    flagged: boolean("flagged").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_messages_conversation_id").on(t.conversationId),
    index("idx_messages_sender_id").on(t.senderId),
  ]
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
