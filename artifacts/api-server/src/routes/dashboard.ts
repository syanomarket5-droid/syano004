import { Router, type IRouter } from "express";
import { eq, sql, inArray, desc, and, avg, count } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  usersTable,
  storeFollowsTable,
  sellerReviewsTable,
  sellerApplicationsTable,
} from "@workspace/db";
import { requireAuth, requireActiveAccount } from "../middlewares/auth";

const router: IRouter = Router();

/* ── GET /dashboard/seller ───────────────────────────────────── */
router.get("/dashboard/seller", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  if (req.user!.role !== "seller") {
    res.status(403).json({ error: "Seller access required" });
    return;
  }

  const sellerId = req.user!.userId;

  // All stats computed in parallel — N+1 eliminated
  const [products, orderIdRows, followerStat, sellerReviewStat, storeRow] = await Promise.all([
    db.select().from(productsTable).where(eq(productsTable.sellerId, sellerId)),

    db
      .selectDistinct({ orderId: orderItemsTable.orderId })
      .from(orderItemsTable)
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

    db
      .select({ storeSlug: sellerApplicationsTable.storeSlug })
      .from(sellerApplicationsTable)
      .where(and(eq(sellerApplicationsTable.userId, sellerId), eq(sellerApplicationsTable.status, "approved")))
      .limit(1),
  ]);

  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.stock < 5).length;

  const ids = orderIdRows.map((r) => r.orderId);

  // Fetch all orders in ONE query (was N individual queries)
  let orders: (typeof ordersTable.$inferSelect)[] = [];
  if (ids.length > 0) {
    orders = await db
      .select()
      .from(ordersTable)
      .where(inArray(ordersTable.id, ids))
      .orderBy(desc(ordersTable.createdAt));
  }

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  // Revenue via SQL aggregation (was loop of N*M queries)
  const [revenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${orderItemsTable.unitPrice}::numeric * ${orderItemsTable.quantity}), 0)`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .where(and(eq(orderItemsTable.sellerId, sellerId), eq(ordersTable.status, "delivered")));

  const totalRevenue = parseFloat(parseFloat(revenueRow?.total ?? "0").toFixed(2));

  const ordersByStatus = [
    { status: "pending",    count: orders.filter((o) => o.status === "pending").length },
    { status: "processing", count: orders.filter((o) => o.status === "processing").length },
    { status: "shipped",    count: orders.filter((o) => o.status === "shipped").length },
    { status: "delivered",  count: orders.filter((o) => o.status === "delivered").length },
    { status: "cancelled",  count: orders.filter((o) => o.status === "cancelled").length },
  ];

  // Recent orders: one query each for orders+customers and items (was N*2 queries)
  const recentIds = ids.slice(0, 5);
  let recentOrders: any[] = [];

  if (recentIds.length > 0) {
    const [recentOrdersData, recentItemsData] = await Promise.all([
      db
        .select({
          orderId: ordersTable.id,
          customerId: ordersTable.customerId,
          customerName: usersTable.name,
          customerEmail: usersTable.email,
          total: ordersTable.total,
          status: ordersTable.status,
          shippingAddress: ordersTable.shippingAddress,
          createdAt: ordersTable.createdAt,
          updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .innerJoin(usersTable, eq(usersTable.id, ordersTable.customerId))
        .where(inArray(ordersTable.id, recentIds))
        .orderBy(desc(ordersTable.createdAt)),

      db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, recentIds)),
    ]);

    const itemsByOrder = new Map<number, typeof orderItemsTable.$inferSelect[]>();
    for (const item of recentItemsData) {
      if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
      itemsByOrder.get(item.orderId)!.push(item);
    }

    recentOrders = recentOrdersData.map((o) => ({
      id: o.orderId,
      customerId: o.customerId,
      customerName: o.customerName ?? "Unknown",
      customerEmail: o.customerEmail ?? "",
      items: (itemsByOrder.get(o.orderId) ?? []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.unitPrice) * item.quantity,
      })),
      total: parseFloat(o.total),
      status: o.status,
      shippingAddress: o.shippingAddress,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }

  const followerCount = Number(followerStat[0]?.count ?? 0);
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

  res.json({
    totalProducts,
    totalOrders,
    totalRevenue,
    pendingOrders,
    lowStockProducts,
    followerCount,
    sellerScore,
    sellerReviewCount: Number(sr?.total ?? 0),
    storeSlug: storeRow[0]?.storeSlug ?? null,
    recentOrders,
    ordersByStatus,
  });
});

/* ── GET /dashboard/seller/analytics ────────────────────────── */
router.get("/dashboard/seller/analytics", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  if (req.user!.role !== "seller") {
    res.status(403).json({ error: "Seller access required" });
    return;
  }

  const sellerId = req.user!.userId;
  const days = Math.min(parseInt((req.query.days as string) || "30", 10), 90);

  const [revenueByDay, topProducts, topViewedProducts, followerGrowth] = await Promise.all([
    db.execute(sql`
      SELECT
        date_trunc('day', o.created_at)::date AS day,
        COALESCE(SUM(oi.unit_price::numeric * oi.quantity), 0)::float AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.seller_id = ${sellerId}
        AND o.status = 'delivered'
        AND o.created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY day ORDER BY day ASC
    `),

    db.execute(sql`
      SELECT
        oi.product_id,
        oi.product_name,
        SUM(oi.unit_price::numeric * oi.quantity)::float AS revenue,
        SUM(oi.quantity)::int AS units_sold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.seller_id = ${sellerId} AND o.status = 'delivered'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY revenue DESC LIMIT 5
    `),

    db
      .select({ id: productsTable.id, name: productsTable.name, viewCount: productsTable.viewCount })
      .from(productsTable)
      .where(eq(productsTable.sellerId, sellerId))
      .orderBy(desc(productsTable.viewCount))
      .limit(5),

    db.execute(sql`
      SELECT
        date_trunc('day', created_at)::date AS day,
        COUNT(*)::int AS new_followers
      FROM store_follows
      WHERE seller_id = ${sellerId}
        AND created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY day ORDER BY day ASC
    `),
  ]);

  res.json({
    period: { days },
    revenueByDay: ((revenueByDay as any).rows as any[]).map((r) => ({ day: r.day, revenue: Number(r.revenue) })),
    topProducts: ((topProducts as any).rows as any[]).map((p) => ({
      productId: Number(p.product_id),
      productName: p.product_name,
      revenue: Number(p.revenue),
      unitsSold: Number(p.units_sold),
    })),
    topViewedProducts: topViewedProducts.map((p) => ({ id: p.id, name: p.name, viewCount: p.viewCount })),
    followerGrowth: ((followerGrowth as any).rows as any[]).map((r) => ({ day: r.day, newFollowers: Number(r.new_followers) })),
  });
});

/* ── GET /dashboard/customer ─────────────────────────────────── */
router.get("/dashboard/customer", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  if (req.user!.role !== "customer") {
    res.status(403).json({ error: "Customer access required" });
    return;
  }

  const customerId = req.user!.userId;
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerId, customerId))
    .orderBy(desc(ordersTable.createdAt));

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  const recentIds = orders.slice(0, 5).map((o) => o.id);
  let recentOrders: any[] = [];

  if (recentIds.length > 0) {
    const [recentOrdersData, recentItemsData] = await Promise.all([
      db
        .select({
          orderId: ordersTable.id,
          customerId: ordersTable.customerId,
          customerName: usersTable.name,
          customerEmail: usersTable.email,
          total: ordersTable.total,
          status: ordersTable.status,
          shippingAddress: ordersTable.shippingAddress,
          createdAt: ordersTable.createdAt,
          updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .innerJoin(usersTable, eq(usersTable.id, ordersTable.customerId))
        .where(inArray(ordersTable.id, recentIds))
        .orderBy(desc(ordersTable.createdAt)),

      db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, recentIds)),
    ]);

    const itemsByOrder = new Map<number, typeof orderItemsTable.$inferSelect[]>();
    for (const item of recentItemsData) {
      if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
      itemsByOrder.get(item.orderId)!.push(item);
    }

    recentOrders = recentOrdersData.map((o) => ({
      id: o.orderId,
      customerId: o.customerId,
      customerName: o.customerName ?? "Unknown",
      customerEmail: o.customerEmail ?? "",
      items: (itemsByOrder.get(o.orderId) ?? []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.unitPrice) * item.quantity,
      })),
      total: parseFloat(o.total),
      status: o.status,
      shippingAddress: o.shippingAddress,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }

  res.json({
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalSpent: parseFloat(totalSpent.toFixed(2)),
    recentOrders,
  });
});

export default router;
