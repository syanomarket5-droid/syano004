import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Additive DB migrations run once at server startup.
 * All statements use IF EXISTS / IF NOT EXISTS guards so they are:
 *  - Safe to re-run on existing deployments (idempotent)
 *  - Safe on a fresh database where tables may not exist yet (will
 *    be created by `drizzle-kit push`; these just add extra columns)
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Order tracking fields (added in order-workflow redesign)
      -- Wrapped in DO block so they only run when the table exists
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'orders'
        ) THEN
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_company TEXT;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number  TEXT;
        END IF;
      END $$;

      -- Permanent audit log for every order status transition
      CREATE TABLE IF NOT EXISTS order_status_history (
        id             SERIAL PRIMARY KEY,
        order_id       INTEGER      NOT NULL,
        from_status    TEXT,
        to_status      TEXT         NOT NULL,
        changed_by     INTEGER,
        changed_by_role TEXT,
        notes          TEXT,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
        ON order_status_history(order_id);

      -- Variant support columns
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items'
        ) THEN
          ALTER TABLE cart_items  ADD COLUMN IF NOT EXISTS variant_id      INTEGER;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items'
        ) THEN
          ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id      INTEGER;
          ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_details TEXT;
        END IF;
        -- product_variants extended pricing/fulfillment columns
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants'
        ) THEN
          ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price           NUMERIC(10,2);
          ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2);
          ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode         TEXT;
          ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight_grams    INTEGER;
          ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS dimensions      TEXT;
        END IF;
      END $$;

      -- Auto-featured products: track delivered sales count per product
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'products'
        ) THEN
          ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;

      -- Account suspension system
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
        ) THEN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by INTEGER;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
    `);

    logger.info("Migrations complete: order shipping fields, order_status_history, variant columns, sales_count, and account_status ready");
  } catch (err) {
    logger.error({ err }, "Migration error — server cannot start safely");
    throw err;
  } finally {
    client.release();
  }
}
