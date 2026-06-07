import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

interface SearchRow {
  id: number;
  seller_id: number;
  seller_name: string;
  name: string;
  description: string;
  price: string;
  discount_percent: string | null;
  category: string;
  subcategory: string | null;
  stock: number;
  image_url: string | null;
  featured: boolean;
  name_ar: string | null;
  created_at: Date;
  score: number;
}

function computeFinalPrice(price: string, discount: string | null): number {
  const p = parseFloat(price);
  if (!discount) return p;
  const d = parseFloat(discount);
  if (d <= 0 || d > 100) return p;
  return parseFloat((p * (1 - d / 100)).toFixed(2));
}

/**
 * GET /api/search?q=<term>&limit=<n>
 *
 * Dedicated search endpoint with pg_trgm relevance scoring.
 * Architecture:
 *   1. Exact name match          → score 1.00
 *   2. Name starts with term     → score 0.95
 *   3. Name contains term        → score 0.85
 *   4. pg_trgm word_similarity   → typo-tolerant fuzzy match (handles "phon"→"phone")
 *   5. Arabic name match         → score 0.85
 *   6. search_tokens match       → score 0.75 (pre-computed: name+nameAr+cat+subcat+desc)
 *   7. Category / subcategory    → score 0.65 / 0.55
 *   8. Description               → score 0.45
 *
 * The cross-language bridge (Arabic↔English synonyms) is handled client-side by
 * expandSearchQuery(), which calls this endpoint once per expanded term.
 */
router.get("/search", async (req, res): Promise<void> => {
  const raw = String(req.query.q ?? "").trim();
  if (raw.length < 2) {
    res.json([]);
    return;
  }

  const rawLimit = parseInt(String(req.query.limit ?? "10"), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 50 ? rawLimit : 10;

  const term = raw.toLowerCase();
  const likePattern = `%${term}%`;

  const { rows } = await pool.query<SearchRow>(
    `WITH scored AS (
      SELECT
        p.id,
        p.seller_id,
        u.name  AS seller_name,
        p.name,
        p.description,
        p.price::text,
        p.discount_percent::text,
        p.category,
        p.subcategory,
        p.stock,
        p.image_url,
        p.featured,
        p.name_ar,
        p.created_at,
        GREATEST(
          CASE WHEN lower(p.name) = $1                                  THEN 1.00 ELSE 0 END,
          CASE WHEN lower(p.name) LIKE $1 || '%'                        THEN 0.95 ELSE 0 END,
          CASE WHEN lower(p.name) LIKE $2                               THEN 0.85 ELSE 0 END,
          word_similarity($1, lower(p.name))                            * 0.90,
          CASE WHEN lower(COALESCE(p.name_ar,       '')) LIKE $2        THEN 0.85 ELSE 0 END,
          word_similarity($1, lower(COALESCE(p.name_ar, '')))           * 0.80,
          CASE WHEN lower(COALESCE(p.search_tokens, '')) LIKE $2        THEN 0.75 ELSE 0 END,
          word_similarity($1, lower(COALESCE(p.search_tokens, '')))     * 0.70,
          CASE WHEN lower(p.category)                    LIKE $2        THEN 0.65 ELSE 0 END,
          word_similarity($1, lower(p.category))                        * 0.60,
          CASE WHEN lower(COALESCE(p.subcategory,   '')) LIKE $2        THEN 0.55 ELSE 0 END,
          CASE WHEN lower(p.description)                 LIKE $2        THEN 0.45 ELSE 0 END,
          word_similarity($1, lower(p.description))                     * 0.35
        ) AS score
      FROM products p
      INNER JOIN users u ON u.id = p.seller_id
      WHERE
        p.stock > 0
        AND (
          lower(p.name)                        LIKE $2
          OR lower(COALESCE(p.name_ar,       '')) LIKE $2
          OR lower(COALESCE(p.search_tokens, '')) LIKE $2
          OR lower(p.category)                    LIKE $2
          OR lower(COALESCE(p.subcategory,   '')) LIKE $2
          OR lower(p.description)                 LIKE $2
          OR word_similarity($1, lower(p.name)) > 0.20
        )
    )
    SELECT * FROM scored
    WHERE score > 0
    ORDER BY score DESC
    LIMIT $3`,
    [term, likePattern, limit],
  );

  const result = rows.map((r) => ({
    id: r.id,
    sellerId: r.seller_id,
    sellerName: r.seller_name ?? "Unknown",
    name: r.name,
    description: r.description,
    price: parseFloat(r.price),
    discountPercent: r.discount_percent ? parseFloat(r.discount_percent) : null,
    finalPrice: computeFinalPrice(r.price, r.discount_percent),
    category: r.category,
    subcategory: r.subcategory ?? null,
    stock: r.stock,
    imageUrl: r.image_url ?? null,
    featured: r.featured,
    nameAr: r.name_ar ?? null,
    createdAt: r.created_at.toISOString(),
    score: Math.round(r.score * 100) / 100,
  }));

  res.setHeader("Cache-Control", "public, max-age=5, stale-while-revalidate=15");
  res.json(result);
});

export default router;
