import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { expandSearchQuery, scoreProduct } from "@/lib/search-utils";

export interface SearchProduct {
  id: number;
  sellerId: number;
  sellerName: string;
  name: string;
  description: string;
  price: number;
  discountPercent: number | null;
  finalPrice: number;
  category: string;
  subcategory: string | null;
  stock: number;
  imageUrl: string | null;
  featured: boolean;
  nameAr: string | null;
  createdAt: string;
  score: number;
}

async function fetchSearchTerm(term: string, limit: number): Promise<SearchProduct[]> {
  const url = `/api/search?q=${encodeURIComponent(term)}&limit=${limit}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return [];
  return res.json() as Promise<SearchProduct[]>;
}

/**
 * Multilingual search hook.
 *
 * Flow:
 *   1. expandSearchQuery(rawQuery) → up to 4 terms (original + AR↔EN synonyms)
 *   2. For each unique term ≥ 2 chars → GET /api/search?q=<term>
 *      The API uses pg_trgm word_similarity for typo-tolerance within a script
 *      (e.g. "phon" matches "phone"), plus exact / ilike / description scoring.
 *   3. Results from all terms are merged, deduplicated by product ID, and
 *      re-ranked by the API-provided score (pg_trgm) then client-side scoreProduct().
 */
export function useSearch(rawQuery: string, { limit = 8 }: { limit?: number } = {}) {
  const terms = useMemo(
    () => (rawQuery.trim().length >= 2 ? expandSearchQuery(rawQuery) : []),
    [rawQuery],
  );

  const term0 = terms[0] ?? "";
  const term1 = terms[1] ?? "";
  const term2 = terms[2] ?? "";

  const q0 = useQuery({
    queryKey: ["search", term0, limit],
    queryFn: () => fetchSearchTerm(term0, limit),
    enabled: term0.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const q1 = useQuery({
    queryKey: ["search", term1, limit],
    queryFn: () => fetchSearchTerm(term1, limit),
    enabled: term1.length >= 2 && term1 !== term0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const q2 = useQuery({
    queryKey: ["search", term2, limit],
    queryFn: () => fetchSearchTerm(term2, limit),
    enabled: term2.length >= 2 && term2 !== term0 && term2 !== term1,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const results = useMemo(() => {
    const all = [
      ...(q0.data ?? []),
      ...(q1.data ?? []),
      ...(q2.data ?? []),
    ];
    const seen = new Set<number>();
    return all
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) ||
          scoreProduct(b, rawQuery) - scoreProduct(a, rawQuery),
      );
  }, [q0.data, q1.data, q2.data, rawQuery]);

  const hasQuery = rawQuery.trim().length >= 2;

  const isLoading =
    (term0.length >= 2 && q0.isFetching) ||
    (term1.length >= 2 && term1 !== term0 && q1.isFetching) ||
    (term2.length >= 2 && term2 !== term0 && term2 !== term1 && q2.isFetching);

  return { results, isLoading, hasQuery };
}
