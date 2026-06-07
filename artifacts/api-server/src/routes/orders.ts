import { Router, type IRouter } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  db, ordersTable, orderItemsTable, cartItemsTable,
  productsTable, usersTable, productVariantsTable, orderStatusHistoryTable,
} from "@workspace/db";
import { createNotification } from "../lib/notif";
import {
  GetOrderParams,
  PlaceOrderBody,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { requireAuth, requireActiveAccount } from "../middlewares/auth";
import { buildVariantData } from "./variants";

const router: IRouter = Router();

const SELLER_TRANSITIONS: Record<string, string[]> = {
  pending:    ["processing"],
  processing: ["shipped"],
  shipped:    ["delivered"],
  delivered:  [],
  cancelled:  [],
  refunded:   [],
};

function computeFinalPrice(price: string, discountPercent: string | null, priceAdjustment = 0): number {
  const p = parseFloat(price) + priceAdjustment;
  if (!discountPercent) return parseFloat(p.toFixed(2));
  const d = parseFloat(discountPercent);
  if (d <= 0 || d > 100) return parseFloat(p.toFixed(2));
  return parseFloat((p * (1 - d / 100)).toFixed(2));
}

async function buildOrderResponse(order: typeof ordersTable.$inferSelect) {
  // Fetch customer and items in parallel (was 2 serial round-trips).
  const [[customer], items] = await Promise.all([
    db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, order.customerId)),
    db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id)),
  ]);

  // Batch-fetch product images and seller names — 2 queries instead of 2×N.
  const productIds = [...new Set(items.map((i) => i.productId))];
  const sellerIds  = [...new Set(items.map((i) => i.sellerId))];

  const [productRows, sellerRows] = await Promise.all([
    productIds.length > 0
      ? db.select({ id: productsTable.id, imageUrl: productsTable.imageUrl })
          .from(productsTable).where(inArray(productsTable.id, productIds))
      : Promise.resolve([] as { id: number; imageUrl: string | null }[]),
    sellerIds.length > 0
      ? db.select({ id: usersTable.id, name: usersTable.name })
          .from(usersTable).where(inArray(usersTable.id, sellerIds))
      : Promise.resolve([] as { id: number; name: string }[]),
  ]);

  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const sellerMap  = new Map(sellerRows.map((s) => [s.id, s]));

  const itemsWithDetails = items.map((item) => {
    let variantDetails: { name: string; value: string }[] | null = null;
    if (item.variantDetails) {
      try { variantDetails = JSON.parse(item.variantDetails); } catch {}
    }
    return {
      productId:      item.productId,
      productName:    item.productName,
      quantity:       item.quantity,
      unitPrice:      parseFloat(item.unitPrice),
      subtotal:       parseFloat((parseFloat(item.unitPrice) * item.quantity).toFixed(2)),
      imageUrl:       productMap.get(item.productId)?.imageUrl ?? null,
      sellerId:       item.sellerId,
      sellerName:     sellerMap.get(item.sellerId)?.name ?? "Unknown",
      variantId:      item.variantId ?? null,
      variantDetails: variantDetails,
    };
  });

  return {
    id:               order.id,
    customerId:       order.customerId,
    customerName:     customer?.name ?? "Unknown",
    customerEmail:    customer?.email ?? "",
    customerPhone:    order.customerPhone ?? null,
    items:            itemsWithDetails,
    total:            parseFloat(order.total),
    status:           order.status,
    shippingAddress:  order.shippingAddress,
    city:             order.city ?? null,
    deliveryNotes:    order.deliveryNotes ?? null,
    estimatedDelivery: order.estimatedDelivery ?? null,
    shippingCompany:  order.shippingCompany ?? null,
    trackingNumber:   order.trackingNumber ?? null,
    createdAt:        order.createdAt.toISOString(),
    updatedAt:        order.updatedAt.toISOString(),
  };
}

/**
 * Mandatory audit-log insert. Errors propagate so the caller can fail the
 * whole status transition atomically — no silent audit-log loss.
 */
async function insertStatusHistory(
  orderId: number,
  fromStatus: string | null,
  toStatus: string,
  changedBy: number | null,
  changedByRole: string | null,
  notes?: string | null
): Promise<void> {
  await db.insert(orderStatusHistoryTable).values({
    orderId,
    fromStatus,
    toStatus,
    changedBy,
    changedByRole,
    notes: notes ?? null,
  });
}

router.get("/orders", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const { userId, role } = req.user!;
  let orders: (typeof ordersTable.$inferSelect)[];

  if (role === "customer") {
    orders = await db.select().from(ordersTable)
      .where(eq(ordersTable.customerId, userId)).orderBy(ordersTable.createdAt);
  } else if (role === "seller") {
    const sellerOrderIds = await db.selectDistinct({ orderId: orderItemsTable.orderId })
      .from(orderItemsTable).where(eq(orderItemsTable.sellerId, userId));
    if (sellerOrderIds.length === 0) { res.json([]); return; }
    const ids = sellerOrderIds.map((r) => r.orderId);
    orders = await db.select().from(ordersTable)
      .where(inArray(ordersTable.id, ids)).orderBy(ordersTable.createdAt);
  } else if (role === "admin") {
    orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  } else {
    orders = [];
  }

  if (orders.length === 0) { res.json([]); return; }

  // Batch all lookups — eliminates N+1 (was: N orders × (1+M*2) queries)
  const orderIds    = orders.map(o => o.id);
  const customerIds = [...new Set(orders.map(o => o.customerId))];

  const [allItems, allCustomers] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)),
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(inArray(usersTable.id, customerIds)),
  ]);

  const uniqueProductIds = [...new Set(allItems.map(i => i.productId))];
  const uniqueSellerIds  = [...new Set(allItems.map(i => i.sellerId))];

  const [allProductImages, allSellers] = await Promise.all([
    uniqueProductIds.length > 0
      ? db.select({ id: productsTable.id, imageUrl: productsTable.imageUrl })
          .from(productsTable).where(inArray(productsTable.id, uniqueProductIds))
      : Promise.resolve([]),
    uniqueSellerIds.length > 0
      ? db.select({ id: usersTable.id, name: usersTable.name })
          .from(usersTable).where(inArray(usersTable.id, uniqueSellerIds))
      : Promise.resolve([]),
  ]);

  const customerMap   = new Map(allCustomers.map(c => [c.id, c]));
  const productImgMap = new Map(allProductImages.map(p => [p.id, p.imageUrl]));
  const sellerNameMap = new Map(allSellers.map(s => [s.id, s.name]));

  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  res.json(
    orders.map(order => {
      const customer = customerMap.get(order.customerId);
      const items    = itemsByOrder.get(order.id) ?? [];
      return {
        id:               order.id,
        customerId:       order.customerId,
        customerName:     customer?.name  ?? "Unknown",
        customerEmail:    customer?.email ?? "",
        customerPhone:    order.customerPhone ?? null,
        items: items.map(item => {
          let variantDetails: { name: string; value: string }[] | null = null;
          if (item.variantDetails) { try { variantDetails = JSON.parse(item.variantDetails); } catch {} }
          return {
            productId:      item.productId,
            productName:    item.productName,
            quantity:       item.quantity,
            unitPrice:      parseFloat(item.unitPrice),
            subtotal:       parseFloat((parseFloat(item.unitPrice) * item.quantity).toFixed(2)),
            imageUrl:       productImgMap.get(item.productId) ?? null,
            sellerId:       item.sellerId,
            sellerName:     sellerNameMap.get(item.sellerId) ?? "Unknown",
            variantId:      item.variantId ?? null,
            variantDetails,
          };
        }),
        total:            parseFloat(order.total),
        status:           order.status,
        shippingAddress:  order.shippingAddress,
        city:             order.city ?? null,
        deliveryNotes:    order.deliveryNotes ?? null,
        estimatedDelivery: order.estimatedDelivery ?? null,
        shippingCompany:  order.shippingCompany ?? null,
        trackingNumber:   order.trackingNumber ?? null,
        createdAt:        order.createdAt.toISOString(),
        updatedAt:        order.updatedAt.toISOString(),
      };
    })
  );
});

router.post("/orders", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  if (req.user!.role !== "customer") {
    res.status(403).json({ error: "Only customers can place orders" });
    return;
  }

  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const cartItems = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.userId, req.user!.userId));
  if (cartItems.length === 0) { res.status(400).json({ error: "Cart is empty" }); return; }

  const productIds = [...new Set(cartItems.map(i => i.productId))];
  const variantIds = cartItems.map(i => i.variantId).filter((id): id is number => id != null);

  // Variant display data (option labels) is read-only and presentation-only — fetch OUTSIDE the transaction.
  const productIdsWithVariants = [...new Set(cartItems.filter(i => i.variantId).map(i => i.productId))];
  const variantDataResults = await Promise.all(productIdsWithVariants.map(pid => buildVariantData(pid)));
  const variantDataMap = new Map(productIdsWithVariants.map((pid, idx) => [pid, variantDataResults[idx]]));

  // Typed aliases for rows returned by raw SQL (column names are snake_case from pg).
  type LockedProduct = { id: number; stock: number; price: string; discount_percent: string | null; seller_id: number; name: string };
  type LockedVariant = { id: number; stock: number; price_adjustment: string; product_id: number };

  let order: typeof ordersTable.$inferSelect;
  let orderItemsData: Array<{
    productId: number; productName: string; quantity: number;
    unitPrice: string; sellerId: number; variantId: number | null; variantDetails: string | null;
  }>;

  try {
    const result = await db.transaction(async (tx) => {
      // ── SELECT FOR UPDATE: lock product rows so no concurrent transaction ────
      // can read or modify the same stock until this transaction commits.
      const productLock = await tx.execute(
        sql`SELECT id, stock, price, discount_percent, seller_id, name
            FROM products
            WHERE id IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})
            FOR UPDATE`
      );
      const lockedProducts = (productLock as any).rows as LockedProduct[];
      const lockedProductMap = new Map(lockedProducts.map(p => [p.id, p]));

      // ── Lock variant rows FOR UPDATE (if any) ───────────────────────────────
      let lockedVariantMap = new Map<number, LockedVariant>();
      if (variantIds.length > 0) {
        const variantLock = await tx.execute(
          sql`SELECT id, stock, price_adjustment, product_id
              FROM product_variants
              WHERE id IN (${sql.join(variantIds.map(id => sql`${id}`), sql`, `)})
              FOR UPDATE`
        );
        const lockedVariants = (variantLock as any).rows as LockedVariant[];
        lockedVariantMap = new Map(lockedVariants.map(v => [v.id, v]));
      }

      // ── Build resolved items from the locked (guaranteed-fresh) rows ─────────
      const resolved = cartItems.map((item) => {
        const product = lockedProductMap.get(item.productId) ?? null;
        let variant: LockedVariant | null = null;
        let variantOptions: { name: string; value: string }[] = [];

        if (item.variantId) {
          const v = lockedVariantMap.get(item.variantId);
          if (v) {
            variant = v;
            const vData = variantDataMap.get(item.productId);
            const vInfo = vData?.variants.find(x => x.id === item.variantId);
            variantOptions = vInfo?.options.map(o => ({ name: o.groupName, value: o.value })) ?? [];
          }
        }

        return { item, product, variant, variantOptions };
      });

      // ── Stock validation against locked values ───────────────────────────────
      // If this throws, the transaction auto-rolls back — no partial state.
      const outOfStockItems = resolved.filter(({ item, product, variant }) => {
        if (!product) return true;
        const effectiveStock = variant ? variant.stock : product.stock;
        return item.quantity > effectiveStock;
      });
      if (outOfStockItems.length > 0) {
        throw Object.assign(new Error("OUT_OF_STOCK"), {
          statusCode: 400,
          items: outOfStockItems.map(({ item, product, variant }) => ({
            productId:   item.productId,
            variantId:   item.variantId ?? null,
            productName: product?.name,
            requested:   item.quantity,
            available:   variant ? variant.stock : (product?.stock ?? 0),
          })),
        });
      }

      // ── Build order items & compute total ────────────────────────────────────
      let total = 0;
      const txOrderItems = resolved
        .filter(({ product }) => product != null)
        .map(({ item, product, variant, variantOptions }) => {
          const priceAdj   = variant ? parseFloat(variant.price_adjustment) : 0;
          const finalPrice = computeFinalPrice(product!.price, product!.discount_percent, priceAdj);
          total           += finalPrice * item.quantity;
          return {
            productId:      product!.id,
            productName:    product!.name,
            quantity:       item.quantity,
            unitPrice:      String(finalPrice),
            sellerId:       product!.seller_id,
            variantId:      item.variantId ?? null,
            variantDetails: variantOptions.length > 0 ? JSON.stringify(variantOptions) : null,
          };
        });

      // ── Insert order ─────────────────────────────────────────────────────────
      const [newOrder] = await tx.insert(ordersTable).values({
        customerId:       req.user!.userId,
        total:            String(parseFloat(total.toFixed(2))),
        status:           "pending",
        shippingAddress:  parsed.data.shippingAddress,
        customerPhone:    parsed.data.customerPhone ?? null,
        city:             parsed.data.city ?? null,
        deliveryNotes:    parsed.data.deliveryNotes ?? null,
        estimatedDelivery: null,
      }).returning();

      // ── Insert order items ───────────────────────────────────────────────────
      await tx.insert(orderItemsTable).values(
        txOrderItems.map(item => ({ ...item, orderId: newOrder.id }))
      );

      // ── Decrement stock atomically (same tx as validation — cannot oversell) ─
      for (const { item, product, variant } of resolved.filter(r => r.product != null)) {
        if (variant) {
          await tx.execute(
            sql`UPDATE product_variants SET stock = GREATEST(0, stock - ${item.quantity}) WHERE id = ${variant.id}`
          );
          // Sync parent product.stock = sum of all its variant stocks
          await tx.execute(
            sql`UPDATE products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = ${product!.id}) WHERE id = ${product!.id}`
          );
        } else {
          await tx.execute(
            sql`UPDATE products SET stock = GREATEST(0, stock - ${item.quantity}) WHERE id = ${product!.id}`
          );
        }
      }

      // ── Clear cart ───────────────────────────────────────────────────────────
      await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user!.userId));

      // ── Mandatory status history entry ───────────────────────────────────────
      await tx.insert(orderStatusHistoryTable).values({
        orderId:       newOrder.id,
        fromStatus:    null,
        toStatus:      "pending",
        changedBy:     req.user!.userId,
        changedByRole: "customer",
        notes:         "Order placed",
      });

      return { order: newOrder, orderItemsData: txOrderItems };
    });

    order = result.order;
    orderItemsData = result.orderItemsData;
  } catch (err: any) {
    if (err.statusCode === 400) {
      res.status(400).json({
        error: "Some items are out of stock or quantity exceeds available stock",
        items: err.items,
      });
      return;
    }
    throw err;
  }

  // ── Notifications — sent after commit so they never block or roll back ───────
  const [customerRecord] = await db.select({ name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const customerName = customerRecord?.name ?? "A customer";

  await createNotification({
    userId: req.user!.userId, type: "order_placed",
    title: "Order Placed Successfully!",
    body: `Your order #${order.id} has been received. Total: $${parseFloat(order.total).toFixed(2)}`,
    orderId: order.id, priority: "important", link: `/orders`,
  });

  const uniqueSellerIds = [...new Set(orderItemsData.map((i) => i.sellerId))];
  for (const sellerId of uniqueSellerIds) {
    await createNotification({
      userId: sellerId, type: "new_order",
      title: "New Order Received!",
      body: `Order #${order.id} from ${customerName} — ${orderItemsData.length} product(s). Total: $${parseFloat(order.total).toFixed(2)}`,
      orderId: order.id, priority: "critical", link: `/seller/orders`,
    });
  }

  res.status(201).json(await buildOrderResponse(order));
});

router.get("/orders/:id", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOrderParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (req.user!.role === "customer" && order.customerId !== req.user!.userId) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  if (req.user!.role === "seller") {
    const [sellerItem] = await db.select().from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, order.id), eq(orderItemsTable.sellerId, req.user!.userId)));
    if (!sellerItem) { res.status(403).json({ error: "Access denied" }); return; }
  }

  res.json(await buildOrderResponse(order));
});

// ── Order history endpoint ─────────────────────────────────────────────────
router.get("/orders/:id/history", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseInt(raw, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const { role, userId } = req.user!;

  if (role === "customer" && order.customerId !== userId) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  if (role === "seller") {
    const [sellerItem] = await db.select().from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, orderId), eq(orderItemsTable.sellerId, userId)));
    if (!sellerItem) { res.status(403).json({ error: "Access denied" }); return; }
  }

  const history = await db
    .select()
    .from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, orderId))
    .orderBy(orderStatusHistoryTable.createdAt);

  res.json(history.map((h) => ({
    id:            h.id,
    orderId:       h.orderId,
    fromStatus:    h.fromStatus ?? null,
    toStatus:      h.toStatus,
    changedBy:     h.changedBy ?? null,
    changedByRole: h.changedByRole ?? null,
    notes:         h.notes ?? null,
    createdAt:     h.createdAt.toISOString(),
  })));
});

router.patch("/orders/:id/status", requireAuth, requireActiveAccount, async (req, res): Promise<void> => {
  const { role, userId } = req.user!;
  if (role !== "seller" && role !== "admin" && role !== "customer") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateOrderStatusParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const newStatus = parsed.data.status as string;
  const currentStatus = order.status as string;

  // ── Customer logic ──────────────────────────────────────────────────────────
  if (role === "customer") {
    if (order.customerId !== userId) { res.status(403).json({ error: "Access denied" }); return; }
    if (newStatus !== "cancelled") { res.status(403).json({ error: "Customers can only cancel orders" }); return; }
    // Customers can cancel from pending or processing (not after shipment)
    if (["shipped", "delivered", "cancelled", "refunded"].includes(currentStatus)) {
      res.status(400).json({ error: "Order cannot be cancelled after shipment" }); return;
    }
  }

  // ── Seller logic ────────────────────────────────────────────────────────────
  if (role === "seller") {
    const allOrderItems = await db.select().from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, order.id));
    const sellerHasItem = allOrderItems.some((i) => i.sellerId === userId);
    if (!sellerHasItem) { res.status(403).json({ error: "Access denied" }); return; }
    const allBelongToSeller = allOrderItems.every((i) => i.sellerId === userId);
    if (!allBelongToSeller) {
      res.status(403).json({ error: "Cannot update status for orders containing other sellers' items" });
      return;
    }
    if (["cancelled", "delivered"].includes(currentStatus)) {
      res.status(403).json({ error: "Cannot modify a cancelled or delivered order" }); return;
    }
    const allowed = SELLER_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      res.status(400).json({ error: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "none"}` });
      return;
    }
    if (newStatus === "shipped" && !parsed.data.estimatedDelivery) {
      res.status(400).json({ error: "estimatedDelivery is required when marking as shipped" }); return;
    }
  }

  // ── Admin logic ─────────────────────────────────────────────────────────────
  if (role === "admin") {
    const ADMIN_TRANSITIONS: Record<string, string[]> = {
      pending:    ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped:    ["delivered", "cancelled"],
      delivered:  ["refunded"],
      cancelled:  [],
      refunded:   [],
    };
    const adminAllowed = ADMIN_TRANSITIONS[currentStatus] ?? [];
    if (!adminAllowed.includes(newStatus)) {
      res.status(400).json({
        error: `Cannot transition order from '${currentStatus}' to '${newStatus}'. Allowed: ${adminAllowed.join(", ") || "none"}`,
      });
      return;
    }
  }

  // ── Restore stock on cancellation (variant-aware) ──────────────────────────
  if (newStatus === "cancelled" && currentStatus !== "cancelled") {
    const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    for (const item of orderItems) {
      if (item.variantId) {
        const [variant] = await db.select().from(productVariantsTable)
          .where(eq(productVariantsTable.id, item.variantId));
        if (variant) {
          const restoredVariantStock = variant.stock + item.quantity;
          await db.update(productVariantsTable).set({ stock: restoredVariantStock })
            .where(eq(productVariantsTable.id, variant.id));
          // Sync parent product.stock
          const allVariants = await db.select({ stock: productVariantsTable.stock })
            .from(productVariantsTable).where(eq(productVariantsTable.productId, item.productId));
          await db.update(productsTable)
            .set({ stock: allVariants.reduce((s, v) => s + v.stock, 0) })
            .where(eq(productsTable.id, item.productId));
        }
      } else {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (product) {
          await db.update(productsTable)
            .set({ stock: product.stock + item.quantity })
            .where(eq(productsTable.id, product.id));
        }
      }
    }
  }

  // ── Persist the status update ───────────────────────────────────────────────
  const updatePayload: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "shipped") {
    if (parsed.data.estimatedDelivery) updatePayload.estimatedDelivery = parsed.data.estimatedDelivery;
    if (parsed.data.shippingCompany != null) updatePayload.shippingCompany = parsed.data.shippingCompany;
    if (parsed.data.trackingNumber != null)  updatePayload.trackingNumber = parsed.data.trackingNumber;
  }

  const [updated] = await db.update(ordersTable)
    .set(updatePayload as any).where(eq(ordersTable.id, params.data.id)).returning();

  // ── Mandatory status history insert ────────────────────────────────────────
  await insertStatusHistory(order.id, currentStatus, newStatus, userId, role);

  // ── Notifications ───────────────────────────────────────────────────────────
  if (newStatus === "processing") {
    await createNotification({ userId: order.customerId, type: "order_processing",
      title: "Order Being Processed",
      body: `Your order #${order.id} is now being processed by the seller.`,
      orderId: order.id, priority: "normal", link: `/orders` });
  } else if (newStatus === "shipped") {
    const estDate = parsed.data.estimatedDelivery
      ? new Date(parsed.data.estimatedDelivery).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "soon";
    await createNotification({ userId: order.customerId, type: "order_shipped",
      title: "Order Shipped!", body: `Your order #${order.id} has been shipped. Estimated delivery: ${estDate}.`,
      orderId: order.id, priority: "important", link: `/orders` });
  } else if (newStatus === "delivered") {
    await createNotification({ userId: order.customerId, type: "order_delivered",
      title: "Order Delivered", body: `Your order #${order.id} has been delivered. Enjoy your purchase!`,
      orderId: order.id, priority: "important", link: `/orders` });

    // Auto-feature: increment salesCount for each delivered item, then promote products
    const deliveredItems = await db
      .select({ productId: orderItemsTable.productId, quantity: orderItemsTable.quantity })
      .from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const FEATURED_THRESHOLD = parseInt(process.env.FEATURED_THRESHOLD ?? "15", 10);
    for (const item of deliveredItems) {
      await db.update(productsTable)
        .set({ salesCount: sql`${productsTable.salesCount} + ${item.quantity}` })
        .where(eq(productsTable.id, item.productId));
    }
    const featuredProductIds = [...new Set(deliveredItems.map((i) => i.productId))];
    if (featuredProductIds.length > 0) {
      await db.update(productsTable)
        .set({ featured: sql`sales_count >= ${FEATURED_THRESHOLD}` })
        .where(inArray(productsTable.id, featuredProductIds));
    }
  } else if (newStatus === "cancelled") {
    await createNotification({ userId: order.customerId, type: "order_cancelled",
      title: "Order Cancelled", body: `Your order #${order.id} has been cancelled.`,
      orderId: order.id, priority: "important", link: `/orders` });

    // If customer cancelled, notify seller(s)
    if (role === "customer") {
      const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      const uniqueSellerIds = [...new Set(orderItems.map((i) => i.sellerId))];
      const [customerRecord] = await db.select({ name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, userId));
      const customerName = customerRecord?.name ?? "A customer";
      for (const sellerId of uniqueSellerIds) {
        await createNotification({
          userId: sellerId, type: "order_cancelled",
          title: "Order Cancelled by Customer",
          body: `Order #${order.id} from ${customerName} has been cancelled.`,
          orderId: order.id, priority: "critical", link: `/seller/orders`,
        });
      }
    }
  } else if (newStatus === "refunded") {
    await createNotification({ userId: order.customerId, type: "order_cancelled",
      title: "Order Refunded", body: `Your order #${order.id} has been refunded.`,
      orderId: order.id, priority: "important", link: `/orders` });
  }

  res.json(await buildOrderResponse(updated));
});

export default router;
