import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sellerApplicationsTable = pgTable("seller_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  storeName: text("store_name").notNull(),
  storeNameAr: text("store_name_ar"),
  phone: text("phone").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  city: text("city").notNull(),
  address: text("address"),
  category: text("category").notNull(),
  categories: text("categories").array(),
  description: text("description").notNull(),
  descriptionAr: text("description_ar"),
  socialLinks: text("social_links"),
  website: text("website"),
  accentColor: text("accent_color"),
  businessInfo: text("business_info"),
  idImageUrl: text("id_image_url"),
  storeLogo: text("store_logo"),
  storeBanner: text("store_banner"),
  storeSlug: text("store_slug"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: integer("reviewed_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SellerApplication = typeof sellerApplicationsTable.$inferSelect;
export type InsertSellerApplication = typeof sellerApplicationsTable.$inferInsert;
