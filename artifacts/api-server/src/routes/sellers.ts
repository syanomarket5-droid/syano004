import { Router, type IRouter } from "express";
import { eq, and, avg, count, desc, sql, ne } from "drizzle-orm";
import {
  db,
  usersTable,
  sellerApplicationsTable,
  productsTable,
  reviewsTable,
  ordersTable,
  orderItemsTable,
  storeFollowsTable,
  sellerReviewsTable,
} from "@workspace/db";
import { requireAuth, requireRole, requireActiveAccount } from "../middlewares/auth";
import { createNotification } from "../lib/notif";

const router: IRouter = Router();

/* ── Shared: compute store stats ────────────────────────────── */
async function getStoreStats(sellerId: number) {
  const [productStats, ratingStats, orderStats, followerStat, sellerReviewStat] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(productsTable)
        .where(eq(productsTable.sellerId, sellerId)),

      db
        .select({ avgRating: avg(reviewsTable.rating), reviewCount: count(reviewsTable.id) })
        .from(reviewsTable)
        .innerJoin(productsTable, eq(productsTable.id, reviewsTable.productId))
        .where(eq(productsTable.sellerId, sellerId)),

      db
        .select({
          total: count(ordersTable.id),
          delivered: sql<number>`cast(count(case when ${ordersTable.status} = 'delivered' then 1 end) as int)`,
          revenue: sql<string>`coalesce(sum(case when ${ordersTable.status} = 'delivered' then ${orderItemsTable.unitPrice}::numeric * ${orderItemsTable.quantity} end), 0)`,
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
        .where(eq(orderItemsTable.sellerId, sellerId)),

      db
        .select({ count: count() })
        .from(storeFollowsTable)
        .where(eq(storeFollowsTable.sellerId, sellerId)),

      db
        .select({
          avgCommunication: avg(sellerReviewsTable.communicationRating),
          avgShipping: avg(sellerReviewsTable.shippingRating),
          avgProfessionalism: avg(sellerReviewsTable.professionalismRating),
          total: count(),
        })
        .from(sellerReviewsTable)
        .where(eq(sellerReviewsTable.sellerId, sellerId)),
    ]);

  const totalOrders = Number(orderStats[0]?.total ?? 0);
  const deliveredOrders = Number(orderStats[0]?.delivered ?? 0);
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 100;

  const sr = sellerReviewStat[0];
  const sellerScore =
    sr && Number(sr.total) > 0
      ? parseFloat(
          (
            parseFloat(sr.avgCommunication ?? "0") * 0.4 +
            parseFloat(sr.avgShipping ?? "0") * 0.3 +
            parseFloat(sr.avgProfessionalism ?? "0") * 0.3
          ).toFixed(1)
        )
      : null;

  return {
    totalProducts: Number(productStats[0]?.count ?? 0),
    averageRating: ratingStats[0]?.avgRating != null ? parseFloat(ratingStats[0].avgRating) : null,
    reviewCount: Number(ratingStats[0]?.reviewCount ?? 0),
    totalOrders,
    completionRate,
    totalRevenue: parseFloat(parseFloat(orderStats[0]?.revenue ?? "0").toFixed(2)),
    followerCount: Number(followerStat[0]?.count ?? 0),
    sellerScore,
    sellerReviewCount: Number(sr?.total ?? 0),
  };
}

/* ── GET /sellers/store/:slug ────────────────────────────────── */
router.get("/sellers/store/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;

  const [storeData] = await db
    .select({
      sellerId: usersTable.id,
      userName: usersTable.name,
      trustLevel: usersTable.trustLevel,
      verifiedAt: usersTable.verifiedAt,
      memberSince: usersTable.createdAt,
      storeName: sellerApplicationsTable.storeName,
      storeSlug: sellerApplicationsTable.storeSlug,
      storeDescription: sellerApplicationsTable.description,
      storeLogo: sellerApplicationsTable.storeLogo,
      storeBanner: sellerApplicationsTable.storeBanner,
      categories: sellerApplicationsTable.categories,
      city: sellerApplicationsTable.city,
      website: sellerApplicationsTable.website,
      socialLinks: sellerApplicationsTable.socialLinks,
    })
    .from(sellerApplicationsTable)
    .innerJoin(usersTable, eq(sellerApplicationsTable.userId, usersTable.id))
    .where(
      and(
        eq(sellerApplicationsTable.storeSlug, slug),
        eq(sellerApplicationsTable.status, "approved")
      )
    );

  if (!storeData) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  const stats = await getStoreStats(storeData.sellerId);

  res.json({
    sellerId: storeData.sellerId,
    storeName: storeData.storeName,
    storeSlug: storeData.storeSlug,
    storeDescription: storeData.storeDescription,
    storeLogo: storeData.storeLogo ?? null,
    storeBanner: storeData.storeBanner ?? null,
    categories: storeData.categories ?? [],
    city: storeData.city ?? null,
    website: storeData.website ?? null,
    socialLinks: storeData.socialLinks ?? null,
    sellerName: storeData.userName,
    trustLevel: storeData.trustLevel ?? "new",
    verifiedAt: storeData.verifiedAt?.toISOString() ?? null,
    memberSince: storeData.memberSince.toISOString(),
    ...stats,
  });
});

/* ── GET /sellers/:id/store-preview ─────────────────────────── */
router.get("/sellers/:id/store-preview", async (req, res): Promise<void> => {
  const sellerId = parseInt(String(req.params.id), 10);
  if (isNaN(sellerId)) { res.status(400).json({ error: "Invalid seller ID" }); return; }

  const [data] = await db
    .select({
      storeName: sellerApplicationsTable.storeName,
      storeSlug: sellerApplicationsTable.storeSlug,
      storeLogo: sellerApplicationsTable.storeLogo,
      trustLevel: usersTable.trustLevel,
      verifiedAt: usersTable.verifiedAt,
      memberSince: usersTable.createdAt,
    })
    .from(sellerApplicationsTable)
    .innerJoin(usersTable, eq(sellerApplicationsTable.userId, usersTable.id))
    .where(
      and(
        eq(sellerApplicationsTable.userId, sellerId),
        eq(sellerApplicationsTable.status, "approved")
      )
    );

  if (!data) { res.status(404).json({ error: "Seller not found" }); return; }

  const [[ratingRow], [followerRow]] = await Promise.all([
    db
      .select({ avgRating: avg(reviewsTable.rating), reviewCount: count(reviewsTable.id) })
      .from(reviewsTable)
      .innerJoin(productsTable, eq(productsTable.id, reviewsTable.productId))
      .where(eq(productsTable.sellerId, sellerId)),
    db
      .select({ count: count() })
      .from(storeFollowsTable)
      .where(eq(storeFollowsTable.sellerId, sellerId)),
  ]);

  res.json({
    sellerId,
    storeName: data.storeName,
    storeSlug: data.storeSlug ?? null,
    storeLogo: data.storeLogo ?? null,
    trustLevel: data.trustLevel ?? "new",
    verifiedAt: data.verifiedAt?.toISOString() ?? null,
    memberSince: data.memberSince.toISOString(),
    averageRating: ratingRow?.avgRating != null ? parseFloat(ratingRow.avgRating) : null,
    reviewCount: Number(ratingRow?.reviewCount ?? 0),
    followerCount: Number(followerRow?.count ?? 0),
  });
});

/* ── POST /sellers/:id/follow ───────────────────────────────── */
router.post("/sellers/:id/follow", requireAuth, requireRole("customer"), requireActiveAccount, async (req, res): Promise<void> => {
  const sellerId = parseInt(String(req.params.id), 10);
  if (isNaN(sellerId)) { res.status(400).json({ error: "Invalid seller ID" }); return; }

  const followerId = req.user!.userId;
  if (followerId === sellerId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }

  const [seller] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(and(eq(usersTable.id, sellerId), eq(usersTable.role, "seller")));

  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }

  const [follow] = await db
    .insert(storeFollowsTable)
    .values({ followerId, sellerId })
    .onConflictDoNothing()
    .returning();

  if (follow) {
    const [follower] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, followerId));

    createNotification({
      userId: sellerId,
      type: "new_follower",
      title: "New Store Follower",
      body: `${follower?.name ?? "Someone"} is now following your store.`,
      link: `/seller/dashboard`,
      priority: "normal",
    }).catch(() => {});
  }

  const [countRow] = await db
    .select({ count: count() })
    .from(storeFollowsTable)
    .where(eq(storeFollowsTable.sellerId, sellerId));

  res.json({ following: true, followerCount: Number(countRow?.count ?? 0) });
});

/* ── DELETE /sellers/:id/follow ─────────────────────────────── */
router.delete("/sellers/:id/follow", requireAuth, requireRole("customer"), requireActiveAccount, async (req, res): Promise<void> => {
  const sellerId = parseInt(String(req.params.id), 10);
  if (isNaN(sellerId)) { res.status(400).json({ error: "Invalid seller ID" }); return; }

  const followerId = req.user!.userId;

  await db
    .delete(storeFollowsTable)
    .where(and(eq(storeFollowsTable.followerId, followerId), eq(storeFollowsTable.sellerId, sellerId)));

  const [countRow] = await db
    .select({ count: count() })
    .from(storeFollowsTable)
    .where(eq(storeFollowsTable.sellerId, sellerId));

  res.json({ following: false, followerCount: Number(countRow?.count ?? 0) });
});

/* ── GET /sellers/:id/follow-status ─────────────────────────── */
router.get("/sellers/:id/follow-status", requireAuth, async (req, res): Promise<void> => {
  const sellerId = parseInt(String(req.params.id), 10);
  if (isNaN(sellerId)) { res.status(400).json({ error: "Invalid seller ID" }); return; }

  const followerId = req.user!.userId;

  const [[follow], [countRow]] = await Promise.all([
    db
      .select({ id: storeFollowsTable.id })
      .from(storeFollowsTable)
      .where(and(eq(storeFollowsTable.followerId, followerId), eq(storeFollowsTable.sellerId, sellerId))),
    db
      .select({ count: count() })
      .from(storeFollowsTable)
      .where(eq(storeFollowsTable.sellerId, sellerId)),
  ]);

  res.json({ following: !!follow, followerCount: Number(countRow?.count ?? 0) });
});

/* ── GET /me/following-stores ───────────────────────────────── */
router.get("/me/following-stores", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const follows = await db
    .select({
      sellerId: storeFollowsTable.sellerId,
      followedAt: storeFollowsTable.createdAt,
      storeName: sellerApplicationsTable.storeName,
      storeSlug: sellerApplicationsTable.storeSlug,
      storeLogo: sellerApplicationsTable.storeLogo,
      trustLevel: usersTable.trustLevel,
      verifiedAt: usersTable.verifiedAt,
    })
    .from(storeFollowsTable)
    .innerJoin(usersTable, eq(usersTable.id, storeFollowsTable.sellerId))
    .leftJoin(
      sellerApplicationsTable,
      and(
        eq(sellerApplicationsTable.userId, storeFollowsTable.sellerId),
        eq(sellerApplicationsTable.status, "approved")
      )
    )
    .where(eq(storeFollowsTable.followerId, userId))
    .orderBy(desc(storeFollowsTable.createdAt));

  res.json(
    follows.map((f) => ({
      sellerId: f.sellerId,
      storeName: f.storeName ?? null,
      storeSlug: f.storeSlug ?? null,
      storeLogo: f.storeLogo ?? null,
      trustLevel: f.trustLevel ?? "new",
      verifiedAt: f.verifiedAt?.toISOString() ?? null,
      followedAt: f.followedAt.toISOString(),
    }))
  );
});

/* ── GET /sellers/:id/reviews ───────────────────────────────── */
router.get("/sellers/:id/reviews", async (req, res): Promise<void> => {
  const sellerId = parseInt(String(req.params.id), 10);
  if (isNaN(sellerId)) { res.status(400).json({ error: "Invalid seller ID" }); return; }

  const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 50);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  const [reviews, [summary]] = await Promise.all([
    db
      .select({
        id: sellerReviewsTable.id,
        customerId: sellerReviewsTable.customerId,
        customerName: usersTable.name,
        communicationRating: sellerReviewsTable.communicationRating,
        shippingRating: sellerReviewsTable.shippingRating,
        professionalismRating: sellerReviewsTable.professionalismRating,
        comment: sellerReviewsTable.comment,
        createdAt: sellerReviewsTable.createdAt,
      })
      .from(sellerReviewsTable)
      .innerJoin(usersTable, eq(usersTable.id, sellerReviewsTable.customerId))
      .where(eq(sellerReviewsTable.sellerId, sellerId))
      .orderBy(desc(sellerReviewsTable.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({
        avgCommunication: avg(sellerReviewsTable.communicationRating),
        avgShipping: avg(sellerReviewsTable.shippingRating),
        avgProfessionalism: avg(sellerReviewsTable.professionalismRating),
        total: count(),
      })
      .from(sellerReviewsTable)
      .where(eq(sellerReviewsTable.sellerId, sellerId)),
  ]);

  const overallScore =
    summary && Number(summary.total) > 0
      ? parseFloat(
          (
            parseFloat(summary.avgCommunication ?? "0") * 0.4 +
            parseFloat(summary.avgShipping ?? "0") * 0.3 +
            parseFloat(summary.avgProfessionalism ?? "0") * 0.3
          ).toFixed(1)
        )
      : null;

  res.json({
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    summary: {
      total: Number(summary?.total ?? 0),
      overallScore,
      avgCommunication: summary?.avgCommunication ? parseFloat(summary.avgCommunication) : null,
      avgShipping: summary?.avgShipping ? parseFloat(summary.avgShipping) : null,
      avgProfessionalism: summary?.avgProfessionalism ? parseFloat(summary.avgProfessionalism) : null,
    },
  });
});

/* ── POST /sellers/:id/reviews ──────────────────────────────── */
router.post("/sellers/:id/reviews", requireAuth, requireRole("customer"), requireActiveAccount, async (req, res): Promise<void> => {
  const sellerId = parseInt(String(req.params.id), 10);
  if (isNaN(sellerId)) { res.status(400).json({ error: "Invalid seller ID" }); return; }

  const customerId = req.user!.userId;
  if (customerId === sellerId) { res.status(400).json({ error: "Cannot review yourself" }); return; }

  const { communicationRating, shippingRating, professionalismRating, comment } = req.body;

  if (
    ![communicationRating, shippingRating, professionalismRating].every(
      (r) => typeof r === "number" && r >= 1 && r <= 5
    )
  ) {
    res.status(400).json({ error: "Each rating must be between 1 and 5" });
    return;
  }

  if (comment !== undefined && comment !== null) {
    if (typeof comment !== "string") {
      res.status(400).json({ error: "Comment must be a string" });
      return;
    }
    if (comment.length > 1000) {
      res.status(400).json({ error: "Comment must be 1000 characters or fewer" });
      return;
    }
  }

  const [[existing], [deliveredOrder], [customer]] = await Promise.all([
    db
      .select({ id: sellerReviewsTable.id })
      .from(sellerReviewsTable)
      .where(and(eq(sellerReviewsTable.sellerId, sellerId), eq(sellerReviewsTable.customerId, customerId))),

    db
      .select({ orderId: ordersTable.id })
      .from(ordersTable)
      .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(
        and(
          eq(ordersTable.customerId, customerId),
          eq(ordersTable.status, "delivered"),
          eq(orderItemsTable.sellerId, sellerId)
        )
      )
      .limit(1),

    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, customerId)),
  ]);

  if (existing) { res.status(409).json({ error: "You have already reviewed this seller" }); return; }
  if (!deliveredOrder) { res.status(403).json({ error: "You can only review sellers from delivered orders" }); return; }

  const [inserted] = await db
    .insert(sellerReviewsTable)
    .values({
      sellerId,
      customerId,
      orderId: deliveredOrder.orderId,
      communicationRating: Math.round(communicationRating),
      shippingRating: Math.round(shippingRating),
      professionalismRating: Math.round(professionalismRating),
      comment: comment ?? null,
    })
    .returning();

  createNotification({
    userId: sellerId,
    type: "new_seller_review",
    title: "New Store Review",
    body: `${customer?.name ?? "A customer"} rated your store.`,
    link: `/seller/dashboard`,
    priority: "normal",
  }).catch(() => {});

  res.status(201).json({ ...inserted, createdAt: inserted.createdAt.toISOString() });
});

/* ── PATCH /sellers/store/branding ──────────────────────────── */
router.patch("/sellers/store/branding", requireAuth, requireRole("seller"), requireActiveAccount, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const {
    storeLogo, logoUrl, storeBanner,
    storeName, storeNameAr,
    storeDescription, descriptionAr,
    storeSlug, storeCity,
    website, socialLinks,
    accentColor, contactPhone, contactEmail,
  } = req.body;

  const [app] = await db
    .select({ id: sellerApplicationsTable.id })
    .from(sellerApplicationsTable)
    .where(and(eq(sellerApplicationsTable.userId, userId), eq(sellerApplicationsTable.status, "approved")));

  if (!app) { res.status(404).json({ error: "Approved store not found" }); return; }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (storeLogo !== undefined)    patch.storeLogo     = storeLogo;
  if (logoUrl !== undefined)      patch.storeLogo     = logoUrl;
  if (storeBanner !== undefined)  patch.storeBanner   = storeBanner;
  if (storeName !== undefined)    patch.storeName     = storeName;
  if (storeNameAr !== undefined)  patch.storeNameAr   = storeNameAr;
  if (storeDescription !== undefined) patch.description = storeDescription;
  if (descriptionAr !== undefined)    patch.descriptionAr = descriptionAr;
  if (website !== undefined)      patch.website       = website;
  if (socialLinks !== undefined)  patch.socialLinks   = socialLinks;
  if (accentColor !== undefined)  patch.accentColor   = accentColor;
  if (contactPhone !== undefined) patch.contactPhone  = contactPhone;
  if (contactEmail !== undefined) patch.contactEmail  = contactEmail;
  if (storeCity !== undefined)    patch.city          = storeCity;
  if (storeSlug !== undefined) {
    const [slugConflict] = await db
      .select({ id: sellerApplicationsTable.id })
      .from(sellerApplicationsTable)
      .where(and(
        eq(sellerApplicationsTable.storeSlug, storeSlug),
        ne(sellerApplicationsTable.id, app.id),
        eq(sellerApplicationsTable.status, "approved")
      ));
    if (slugConflict) {
      res.status(409).json({ error: "This store URL is already taken. Please choose a different one." });
      return;
    }
    patch.storeSlug = storeSlug;
  }

  const [updated] = await db
    .update(sellerApplicationsTable)
    .set(patch as any)
    .where(eq(sellerApplicationsTable.id, app.id))
    .returning();

  res.json(updated);
});

export default router;
