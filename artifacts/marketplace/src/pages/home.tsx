import React from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useListProducts, useGetBestSellers, useGetPublicSettings, getListProductsQueryKey, getGetBestSellersQueryKey, getGetPublicSettingsQueryKey } from "@workspace/api-client-react";
import { FEATURES } from "@/lib/features";
import {
  ArrowRight, ShieldCheck, Truck, RotateCcw, Tag,
  Zap, Star, Store, TrendingUp, Timer, Flame,
  Cpu, Shirt, Sparkles, Home as HomeIcon, ShoppingBasket, Dumbbell,
  Car, Gamepad2, BookOpen, PawPrint, Download, Palette,
  Gem, Baby, Wrench, TreePine, Gift,
} from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "@/lib/categories";
import { useSEO } from "@/hooks/useSEO";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";

/* ── Category photo map — verified Unsplash & Pexels URLs ───── */
const CATEGORY_IMAGES: Record<string, string> = {
  /* Electronics: circuit board macro — iconic Unsplash photo */
  "Electronics":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&auto=format&fit=crop",
  /* Fashion: clothing rack in boutique */
  "Fashion":
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80&auto=format&fit=crop",
  /* Beauty: skincare & cosmetics flat-lay */
  "Beauty & Personal Care":
    "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1",
  /* Home & Kitchen: modern bright kitchen */
  "Home & Kitchen":
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80&auto=format&fit=crop",
  /* Grocery: colourful fresh produce market */
  "Supermarket & Grocery":
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80&auto=format&fit=crop",
  /* Sports: dumbbell weights on gym floor */
  "Sports & Fitness":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80&auto=format&fit=crop",
  /* Automotive: sleek sports car on road */
  "Automotive":
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80&auto=format&fit=crop",
  /* Gaming: RGB gaming setup */
  "Gaming & Entertainment":
    "https://images.pexels.com/photos/4317157/pexels-photo-4317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1",
  /* Books: warm library bookshelf */
  "Books & Stationery":
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80&auto=format&fit=crop",
  /* Pets: golden retriever dog */
  "Pet Supplies":
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80&auto=format&fit=crop",
  /* Digital: open laptop on clean desk */
  "Digital Products":
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80&auto=format&fit=crop",
  /* Handmade: artisan pottery hands */
  "Handmade & Crafts":
    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80&auto=format&fit=crop",
  /* Jewelry: gold rings on marble */
  "Jewelry & Luxury":
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80&auto=format&fit=crop",
  /* Baby: smiling toddler */
  "Baby & Kids":
    "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&q=80&auto=format&fit=crop",
  /* Tools: hand tools on workshop table */
  "Tools & Construction":
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&q=80&auto=format&fit=crop",
  /* Garden: lush green garden */
  "Garden & Outdoor":
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80&auto=format&fit=crop",
  /* Gifts: wrapped gift boxes with ribbons */
  "Gifts & Events":
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80&auto=format&fit=crop",
};

/* ── Hero background (subtle oriental market atmosphere) ─────── */
/* Primary: vibrant spices & dried goods in Istanbul market — Pexels #7317590 */
const HERO_IMAGE =
  "https://images.pexels.com/photos/7317590/pexels-photo-7317590.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1&fit=crop&crop=center";
/* Fallback: bustling Grand Bazaar Istanbul — Pexels #34215007 */
const HERO_IMAGE_FALLBACK =
  "https://images.pexels.com/photos/34215007/pexels-photo-34215007/free-photo-of-vibrant-scene-at-istanbul-s-grand-bazaar.jpeg?auto=compress&cs=tinysrgb&w=1920&fit=crop&crop=center";

/* ── Icon map (keyed by icon name string in category data) ───── */
const ICON_MAP: Record<string, React.ElementType> = {
  Cpu, Shirt, Sparkles, Home: HomeIcon, ShoppingBasket, Dumbbell,
  Car, Gamepad2, BookOpen, PawPrint, Download, Palette,
  Gem, Baby, Wrench, TreePine, Gift,
};

/* ── Flash Sale countdown timer — isolated to prevent full-page rerenders ── */

/**
 * FlashSaleTimerBadge — pure display component.
 * Receives pre-formatted string from its nearest ancestor that owns the clock.
 */
function FlashSaleTimerBadge({ formatted }: { formatted: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-rose-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full tabular-nums">
      <Timer className="h-3 w-3 shrink-0" />
      <span className="opacity-80">{t("home.flash_sale_ends_in")}</span>
      <span dir="ltr">{formatted}</span>
    </span>
  );
}

/**
 * HotDealsSection — owns the `useCountdown` tick so only this section
 * re-renders every second, not the entire Home component tree.
 */
const HotDealsSection = React.memo(function HotDealsSection({
  hotDeals,
  isLoadingProducts,
  getFlashSaleTarget,
}: {
  hotDeals: import("@workspace/api-client-react").Product[];
  isLoadingProducts: boolean;
  getFlashSaleTarget: () => Date;
}) {
  const { t } = useTranslation();
  const { formatted: flashSaleFormatted } = useCountdown(getFlashSaleTarget);

  return (
    <section className="py-10 md:py-14 border-b bg-gradient-to-br from-rose-950/30 via-background to-background">
      <div className="container px-4">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Flame className="h-4 w-4 text-rose-500" />
              </div>
              <h2 className="heading-section">{t("home.deals_title")}</h2>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 bg-rose-500/15 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full">
              <Zap className="h-3 w-3" />
              {t("home.deals_badge")}
            </span>
            <FlashSaleTimerBadge formatted={flashSaleFormatted} />
          </div>
          <Link
            href="/products?hasDiscount=true"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
          >
            {t("home.view_all_deals")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="product-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {isLoadingProducts
            ? Array(4).fill(0).map((_, i) => <ProductSkeleton key={i} />)
            : hotDeals.map((p) => <ProductCard key={p.id} product={p} flashSaleEndsIn={flashSaleFormatted} />)
          }
        </div>
      </div>
    </section>
  );
});

/* ── Section header helper ───────────────────────────────────── */
function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5 md:mb-7">
      <h2 className="heading-section">{title}</h2>
      <Link
        href={viewAllHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
      >
        {viewAllLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ── Product skeleton ────────────────────────────────────────── */
function ProductSkeleton() {
  return (
    <div className="flex flex-col space-y-3 animate-pulse">
      <div className="aspect-[3/4] sm:aspect-[4/5] md:aspect-square bg-muted rounded-xl" />
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-1/3" />
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { handleOpenYourStore } = useSellerOnboarding();
  const { data: products, isLoading: isLoadingProducts } = useListProducts(
    {},
    { query: { staleTime: 3 * 60 * 1000, gcTime: 10 * 60 * 1000, queryKey: getListProductsQueryKey({}) } }
  );

  useSEO({
    title:
      lang === "ar"
        ? "سيانو — أول سوق إلكتروني في سوريا"
        : "Shop electronics, fashion, home goods & more",
    description:
      lang === "ar"
        ? "تسوّق من بائعين موثوقين عبر حلب وسوريا. إلكترونيات، أزياء، أدوات منزلية، توصيل سريع، دفع آمن."
        : "Syria's trusted online marketplace. Shop electronics, fashion, beauty, home goods and more from vetted Syrian sellers. Fast delivery, secure payments.",
    canonical: "/",
  });

  /* Derived product lists */
  const newArrivals = products?.slice(0, 4) ?? [];
  const hotDeals    = products?.filter((p) => p.isBestDeal).slice(0, 4) ?? [];

  /* Products sorted by averageRating — used as fallback for Featured Products.
     Featured Products shows seller-flagged products first, then fills remaining
     slots with top-rated products. */
  const sortedByRating = React.useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  }, [products]);

  const featuredProducts = React.useMemo(() => {
    if (!products) return [];
    const sellerFeatured = products.filter((p) => p.featured);
    if (sellerFeatured.length >= 4) return sellerFeatured.slice(0, 4);
    const featuredIds = new Set(sellerFeatured.map((p) => p.id));
    const topRated = sortedByRating.filter((p) => !featuredIds.has(p.id));
    return [...sellerFeatured, ...topRated].slice(0, 4);
  }, [products, sortedByRating]);

  /* Best Sellers: sourced from the dedicated API endpoint that aggregates real
     purchase volume (sum of order_items.quantity per product), falling back to
     rating only as a tiebreaker when two products have identical sales counts. */
  const { data: bestSellersData, isLoading: isLoadingBestSellers } = useGetBestSellers(4, {
    query: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, queryKey: getGetBestSellersQueryKey(4) },
  });
  const bestSellers = bestSellersData ?? [];

  /* Public settings — carries the admin-controlled flashSaleEnd timestamp.
     This query is cached by React Query and is NOT tied to auth state, so
     the value never changes when users log in, log out, or switch accounts. */
  const { data: publicSettings } = useGetPublicSettings({
    query: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000, queryKey: getGetPublicSettingsQueryKey() },
  });

  /* Flash-sale countdown — target comes from the DB via publicSettings.
     Using a server-provided ISO timestamp means:
       ✓ Identical countdown on every device and for every user (logged-in or guest)
       ✓ Not affected by login / logout / session refresh
       ✓ Fully controlled by admins via the admin settings panel
     Fallback: end of the current UTC day — consistent across all clients. */
  const getFlashSaleTarget = React.useCallback(() => {
    if (publicSettings?.flashSaleEnd) return new Date(publicSettings.flashSaleEnd);
    // Stable UTC fallback: midnight at the end of today, same for all users
    const ms = 24 * 60 * 60 * 1000;
    return new Date(Math.ceil(Date.now() / ms) * ms);
  }, [publicSettings?.flashSaleEnd]);

  return (
    <Layout>
      <div className="w-full">

        {/* ════════════════════════════════════════════════════════
            HERO — full-bleed market photo with dark overlay
        ════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-b min-h-[420px] sm:min-h-[500px] md:min-h-[580px] lg:min-h-[660px] xl:min-h-[720px] flex items-center">

          {/* ── Full-bleed background image ── */}
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src={HERO_IMAGE}
              alt=""
              fetchPriority="high"
              decoding="async"
              sizes="100vw"
              srcSet={[
                "https://images.pexels.com/photos/7317590/pexels-photo-7317590.jpeg?auto=compress&cs=tinysrgb&w=768&h=600&fit=crop&crop=center 768w",
                "https://images.pexels.com/photos/7317590/pexels-photo-7317590.jpeg?auto=compress&cs=tinysrgb&w=1280&h=800&fit=crop&crop=center 1280w",
                "https://images.pexels.com/photos/7317590/pexels-photo-7317590.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop&crop=center 1920w",
              ].join(", ")}
              style={{ objectPosition: "center 40%" }}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = HERO_IMAGE_FALLBACK;
              }}
            />

            {/* Layer 1 — deep dark vignette: darkest at edges, lighter in centre */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

            {/* Layer 2 — left-side darkening so RTL badge/text always readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

            {/* Layer 3 — emerald brand tint bleeding from bottom-start */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent" />

            {/* Layer 4 — top edge darkened for nav contrast */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
          </div>

          {/* Decorative emerald orbs — complement the market warmth */}
          <div className="pointer-events-none absolute -top-16 -end-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

          {/* ── Content ── */}
          <div className="container px-4 py-12 sm:py-20 md:py-28 lg:py-32 relative z-10 w-full">
            <div className="max-w-2xl mx-auto text-center space-y-5">

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-primary/20 text-primary border border-primary/30 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                <Zap className="h-3.5 w-3.5" />
                {t("home.hero_badge")}
              </div>

              {/* Headline — fluid clamp() scale: 26px mobile → 56px desktop */}
              <h1 className="heading-hero text-white drop-shadow-lg">
                {t("home.hero_title")}
              </h1>

              {/* Sub-copy */}
              <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-xl mx-auto drop-shadow">
                {t("home.hero_desc")}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/products">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-semibold w-full sm:w-auto shadow-lg shadow-primary/30"
                  >
                    {t("home.shop_all")}
                    <ArrowRight className="ms-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            TRUST BAR
        ════════════════════════════════════════════════════════ */}
        <section className="border-b bg-muted/20">
          <div className="container px-4 py-4">
            <div className={`grid gap-3 ${FEATURES.RETURNS_ENABLED ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
              {[
                { icon: <Truck className="h-4 w-4 shrink-0 text-primary" />,       label: t("product_detail.fast_shipping"),      sub: t("product_detail.fast_shipping_desc") },
                { icon: <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />, label: t("product_detail.secure_payment"),     sub: t("product_detail.secure_payment_desc") },
                { icon: <Tag className="h-4 w-4 shrink-0 text-primary" />,          label: t("home.best_prices"),                  sub: t("home.best_prices_sub") },
                // RETURNS_ENABLED: hidden until feature launches — do not delete
                ...(FEATURES.RETURNS_ENABLED ? [{ icon: <RotateCcw className="h-4 w-4 shrink-0 text-primary" />, label: t("product_detail.easy_returns"), sub: t("product_detail.easy_returns_desc") }] : []),
              ].map(({ icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2.5 py-1">
                  {icon}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight line-clamp-2">{label}</p>
                    <p className="text-xs text-muted-foreground leading-tight hidden sm:block">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            HOT DEALS — rendered by isolated HotDealsSection so
            the 1-second countdown only re-renders that subtree.
        ════════════════════════════════════════════════════════ */}
        {(isLoadingProducts || hotDeals.length > 0) && (
          <HotDealsSection
            hotDeals={hotDeals}
            isLoadingProducts={isLoadingProducts}
            getFlashSaleTarget={getFlashSaleTarget}
          />
        )}

        {/* ════════════════════════════════════════════════════════
            FEATURED PRODUCTS — المنتجات المميزة
        ════════════════════════════════════════════════════════ */}
        {(isLoadingProducts || featuredProducts.length > 0) && (
          <section className="py-10 md:py-14 border-b cv-section">
            <div className="container px-4">
              <SectionHeader
                title={t("home.featured_title")}
                viewAllHref="/products?sort=highest_rated"
                viewAllLabel={t("home.view_all")}
              />
              <div className="product-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {isLoadingProducts
                  ? Array(4).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                  : featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)
                }
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
            NEW ARRIVALS — الأحدث
        ════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-14 border-b cv-section">
          <div className="container px-4">
            <SectionHeader
              title={t("home.arrivals_title")}
              viewAllHref="/products"
              viewAllLabel={t("home.view_all")}
            />
            <div className="product-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {isLoadingProducts
                ? Array(4).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                : newArrivals.length === 0
                  ? <p className="col-span-full text-center text-muted-foreground py-8">{t("home.no_products")}</p>
                  : newArrivals.map((p) => <ProductCard key={p.id} product={p} />)
              }
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            BEST SELLERS — الأكثر مبيعاً
        ════════════════════════════════════════════════════════ */}
        {(isLoadingBestSellers || bestSellers.length > 0) && (
          <section className="py-10 md:py-14 border-b bg-muted/10 cv-section">
            <div className="container px-4">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t("home.bestsellers_title")}</h2>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    {t("home.bestsellers_badge")}
                  </span>
                </div>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                >
                  {t("home.view_all")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="product-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {isLoadingBestSellers
                  ? Array(4).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                  : bestSellers.map((p) => <ProductCard key={p.id} product={p} />)
                }
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
            CATEGORIES — الفئات — large photo cards, max 5 per row
        ════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-16 border-b bg-muted/10 cv-section">
          <div className="container px-4">
            <SectionHeader
              title={t("home.categories_title")}
              viewAllHref="/products"
              viewAllLabel={t("home.view_all")}
            />

            {/* 2 cols → 3 → 4 → 5, with generous gap */}
            <div className="product-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.icon] ?? Store;
                const img  = CATEGORY_IMAGES[cat.slug];
                return (
                  <Link
                    key={cat.slug}
                    href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  >
                    {/* Card — taller aspect ratio for prominence */}
                    <div className="relative group overflow-hidden rounded-2xl border border-border/50 hover:border-primary/50 cursor-pointer aspect-[4/3] shadow-sm hover:shadow-md transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 active:scale-[0.97]">

                      {/* Photo background */}
                      {img ? (
                        <img
                          src={img}
                          alt={cat.en}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            el.style.display = "none";
                            const parent = el.parentElement;
                            if (parent) parent.dataset.noimg = "true";
                          }}
                        />
                      ) : (
                        /* Solid colour fallback tile */
                        <div className={`absolute inset-0 ${cat.iconBg}`} />
                      )}

                      {/* Gradient overlay — heavy at bottom, lighter at top */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/0 group-hover:from-black/70 transition-[background] duration-200" />

                      {/* Top-right icon badge */}
                      <div className="absolute top-2.5 end-2.5 z-10">
                        <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full ${cat.iconBg} flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/25`}>
                          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${cat.iconColor}`} />
                        </div>
                      </div>

                      {/* Bottom label */}
                      <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-3.5">
                        <span className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 block drop-shadow">
                          {lang === "ar" ? cat.ar : cat.en}
                        </span>
                      </div>

                      {/* Emerald shimmer on hover */}
                      <div className="absolute inset-0 ring-2 ring-primary/0 group-hover:ring-primary/30 rounded-2xl transition-all duration-300 pointer-events-none" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            BOTTOM CTA BANNER
        ════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-14 bg-primary/5 border-b">
          <div className="container px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("home.sell_cta_title")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("home.sell_cta_desc")}</p>
                </div>
              </div>
              <Button variant="outline" className="shrink-0 h-11 px-6 font-semibold w-full sm:w-auto" onClick={handleOpenYourStore}>
                {t("home.sell_cta_btn")}
                <ArrowRight className="ms-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
