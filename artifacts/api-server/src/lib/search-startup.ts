import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Run once at server startup to configure PostgreSQL for fast multilingual search:
 * - pg_trgm extension  → fuzzy / typo-tolerant matching via word_similarity()
 * - normalize_ar()     → strip Arabic diacritics + normalise alef/ya/ta-marbuta at SQL level
 * - name_ar column     → optional Arabic product name (bilingual indexing)
 * - search_tokens col  → pre-computed combined text: name + nameAr + category + subcategory
 * - GIN trigram indexes → fast similarity queries on all text columns
 */
export async function runSearchStartup(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Fuzzy matching (typos, partials, single-language)
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      -- Arabic diacritic / alef / ya / ta-marbuta normalisation
      CREATE OR REPLACE FUNCTION normalize_ar(input text)
      RETURNS text
      LANGUAGE sql IMMUTABLE STRICT
      AS $fn$
        SELECT
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(lower(input),
                  '[\\u064B-\\u065F\\u0670\\u0640]', '', 'g'
                ),
                '[\\u0622\\u0623\\u0625\\u0671]', '\\u0627', 'g'
              ),
              '\\u0649', '\\u064A', 'g'
            ),
            '\\u0629', '\\u0647', 'g'
          )
      $fn$;

      ALTER TABLE products ADD COLUMN IF NOT EXISTS name_ar       text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS search_tokens text;

      CREATE INDEX IF NOT EXISTS products_name_trgm   ON products USING gin(name          gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS products_namar_trgm  ON products USING gin(name_ar       gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS products_tokens_trgm ON products USING gin(search_tokens gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS products_cat_trgm    ON products USING gin(category      gin_trgm_ops);
    `);

    await client.query(`
      UPDATE products
      SET search_tokens = lower(
        name || ' ' ||
        COALESCE(name_ar, '') || ' ' ||
        category || ' ' ||
        COALESCE(subcategory, '') || ' ' ||
        substring(description for 150)
      )
      WHERE search_tokens IS NULL;
    `);

    logger.info("Search startup complete: pg_trgm enabled, indexes created");
  } catch (err) {
    logger.warn({ err }, "Search startup non-fatal warning — app continues");
  } finally {
    client.release();
  }
}
