---
name: Variant system architecture
description: Full Amazon/Shopify-grade product variant system — schema, API contract, gallery switching, absolute pricing, and UI patterns.
---

## DB Schema (5 tables + variant_images)

- `product_variant_groups` (id, productId, name, position)
- `product_variant_options` (id, groupId, value, position)
- `product_variants` (id, productId, sku, price ABSOLUTE, compare_at_price, price_adjustment LEGACY, barcode, weight_grams, dimensions, stock, image_url LEGACY, active)
- `product_variant_values` (variantId, optionId) — join table
- `variant_images` (id, variant_id, url, position, option_value_id nullable FK)

Plus: `cart_items.variantId`, `order_items.variantId` + `order_items.variantDetails` (JSONB snapshots label at order time).

**Why:** Relational design. priceAdjustment kept for backward compat with old variants. variant_images enables multi-image per variant for gallery switching.

## Pricing model (Shopify/Amazon style)

- `variant.price` = ABSOLUTE selling price (null = inherit: product.price + priceAdjustment × discount)
- `variant.compareAtPrice` = crossed-out original price (null = no strikethrough)
- PDP resolves: `effectiveSellPrice`, `effectiveCompareAt`, `hasDiscount`, `displayDiscountPct`
- Leave price null → legacy path uses product.discountPercent

**Why:** Clean per-variant pricing without chained adjustments. Supports mix of legacy + new variants.

## Gallery switching (buyer PDP, products/[id].tsx)

- First variant group (index 0, typically "Color") drives gallery switching
- On first-group option select: collect images from ALL variants sharing that optionId → deduplicate → replace gallery
- Fallback order: resolved variant images → product imageUrl + imageUrls
- `window.history.replaceState` updates URL query params on selection (`?Color=Red&Size=M`)
- `setActiveImage(null)` triggered when `selectedFirstOptionId` changes (reset thumbnail)

## API (routes/variants.ts)

- `buildVariantData(productId)` — 3 queries via batch inArray (no N+1). Each variant includes `images: { id, url, position, optionValueId }[]`
- `POST /products/:id/variants/bulk` — Deletes all groups (cascade), re-creates everything. Accepts `{ groups[], variants[{ price, compareAtPrice, barcode, weightGrams, images[], ...}] }`. Syncs products.stock to sum of variant stocks.
- `PATCH /products/:id/variants/:variantId` — Partial update; replaces entire images array if provided.
- Cart: PATCH/DELETE `/api/cart/items/:cartItemId` (NOT `:productId`).

## VariantBuilder.tsx (seller UI)

Exports: `AttributeGroup`, `VariantRow`, `cartesianVariants()`, `buildVariantPayload()`, `VariantBuilder`

VariantRow fields: `id, combination, label, sku, price: number|null, compareAtPrice: number|null, barcode, weightGrams: number|null, stock, images: string[], active`

UI features:
- Bulk apply bar: set price + stock across all rows at once (visible when >1 variant)
- Per-variant images: collapsible section per row, up to 8 URL inputs + live thumbnails
- "Copy to same [attr]" button: copies images to all rows sharing same first-attribute value
- First-group star hint: "gallery images will switch" note on group index 0
- Spreadsheet header: Variant | SKU | Price ($) | Was ($) | Stock | On
- `buildVariantPayload(groups, rows)` converts VariantBuilder state to API format

## Edit page (seller/products/[id]/edit.tsx)

- Loads existing variants from product.variantGroups + product.variants (already in GET /products/:id via buildVariantData)
- Converts API → VariantBuilder format in useEffect([product?.id])
- Uses mutateAsync + sequential fetch calls (discount then variants) in async onSubmit
- DELETE /variants called when variantsEnabled toggled off

## new.tsx

Already calls `buildVariantPayload(variantGroups, variantRows)` in onSuccess — no changes needed.

## Backward Compatibility

- Old products without variants: hasVariants = false, all effective* fall back to product.*
- Old variants without price: price=null → legacy priceAdjustment + product discount path
- Cart items without variants: variantDetails optional
