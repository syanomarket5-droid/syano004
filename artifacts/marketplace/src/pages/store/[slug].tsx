import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import {
  Star, Shield, Users, Package, ShoppingBag, Calendar,
  MapPin, Globe, CheckCircle2, MessageCircle, ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  useGetStoreProfile,
  useGetFollowStatus,
  getFollowStatusQueryKey,
  useFollowStore,
  useUnfollowStore,
  useGetSellerReviews,
  getSellerReviewsQueryKey,
  useStartConversation,
  useListProducts,
  type StoreProfile,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

/* ── Helpers ─────────────────────────────────────────────────── */

function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const s = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= full ? "fill-amber-400 text-amber-400" : i === full + 1 && half ? "fill-amber-200 text-amber-400" : "fill-none text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function TrustBadge({ level, verifiedAt }: { level: string; verifiedAt: string | null }) {
  const { t } = useTranslation();
  if (verifiedAt || level === "established" || level === "trusted") {
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
        <Shield className="h-3 w-3 shrink-0" />
        {t("store.verified_seller")}
      </span>
    );
  }
  return null;
}

/* ── Follow Button ───────────────────────────────────────────── */
function FollowButton({ sellerId }: { sellerId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: status, isLoading } = useGetFollowStatus(sellerId, {
    query: { enabled: !!user && user.role === "customer", queryKey: getFollowStatusQueryKey(sellerId) },
  });
  const followMut = useFollowStore();
  const unfollowMut = useUnfollowStore();

  if (!user || user.role !== "customer") return null;
  if (isLoading) return <Skeleton className="h-9 w-32 rounded-xl" />;

  const following = status?.following ?? false;
  const count = status?.followerCount ?? 0;

  const toggle = () => {
    if (following) {
      unfollowMut.mutate(sellerId, {
        onError: () => toast({ title: t("common.error"), description: t("store.unfollow_error"), variant: "destructive" }),
      });
    } else {
      followMut.mutate(sellerId, {
        onSuccess: () => toast({ title: t("store.follow_success_title"), description: t("store.follow_success_desc") }),
        onError: () => toast({ title: t("common.error"), description: t("store.follow_error"), variant: "destructive" }),
      });
    }
  };

  const busy = followMut.isPending || unfollowMut.isPending;

  return (
    <Button
      onClick={toggle}
      disabled={busy}
      variant={following ? "secondary" : "default"}
      className="gap-2 h-9 rounded-xl"
    >
      {following ? (
        <><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> {t("store.following")}</>
      ) : (
        <><Users className="h-4 w-4 shrink-0" /> {t("store.follow")}</>
      )}
      {count > 0 && <span className="text-xs font-normal opacity-70">({count})</span>}
    </Button>
  );
}

/* ── Contact Button ──────────────────────────────────────────── */
function ContactButton({ sellerId }: { sellerId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const startConv = useStartConversation();

  if (!user || user.role !== "customer") return null;

  const handleContact = () => {
    startConv.mutate(
      { sellerId },
      {
        onSuccess: () => navigate("/messages"),
        onError: () => toast({ title: t("common.error"), description: t("store.contact_error"), variant: "destructive" }),
      }
    );
  };

  return (
    <Button
      variant="outline"
      onClick={handleContact}
      disabled={startConv.isPending}
      className="gap-2 h-9 rounded-xl"
    >
      <MessageCircle className="h-4 w-4 shrink-0" />
      {t("store.contact_seller")}
    </Button>
  );
}

/* ── Stats Bar ───────────────────────────────────────────────── */
function StatItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 sm:px-5">
      <Icon className="h-4 w-4 text-muted-foreground mb-0.5" />
      <span className="text-lg font-black text-foreground tabular-nums leading-tight">{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

/* ── Review Card ─────────────────────────────────────────────── */
function ReviewCard({ review }: { review: any }) {
  const { t } = useTranslation();
  const avg = ((review.communicationRating + review.shippingRating + review.professionalismRating) / 3);
  return (
    <div className="border rounded-2xl p-4 bg-card space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {review.customerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold">{review.customerName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <RatingStars rating={Math.round(avg)} />
          <span className="text-xs text-muted-foreground">{avg.toFixed(1)}</span>
        </div>
      </div>
      {review.comment && <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground border-t pt-2">
        <span>{t("store.communication")}: {review.communicationRating}/5</span>
        <span>{t("store.shipping")}: {review.shippingRating}/5</span>
        <span>{t("store.professionalism")}: {review.professionalismRating}/5</span>
      </div>
    </div>
  );
}

/* ── Products Grid (mini) ────────────────────────────────────── */
function StoreProducts({ sellerId }: { sellerId: number }) {
  const { format: fmtCurrency } = useCurrency();
  const { t } = useTranslation();
  const { data, isLoading } = useListProducts({ sellerId });

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
    </div>
  );

  const products = (data as any)?.products ?? data ?? [];

  if (!products.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">{t("store.no_products")}</p>
        <p className="text-sm mt-1">{t("store.no_products_desc")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {products.map((p: any) => (
        <Link key={p.id} href={`/products/${p.id}`}>
          <div className="group border rounded-2xl overflow-hidden bg-card hover:shadow-md transition-all cursor-pointer">
            <div className="aspect-square bg-muted/40 overflow-hidden">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold line-clamp-2 leading-snug">{p.name}</p>
              <div className="flex items-end justify-between mt-2 gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  {p.discountPercent && p.discountPercent > 0 ? (
                    <>
                      <span className="text-[10px] text-muted-foreground line-through leading-none">
                        {fmtCurrency(p.price)}
                      </span>
                      <span className="text-primary font-bold text-sm leading-tight truncate">
                        {fmtCurrency(p.finalPrice ?? p.price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-primary font-bold text-sm truncate">
                      {fmtCurrency(p.price)}
                    </span>
                  )}
                </div>
                {p.discountPercent && p.discountPercent > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    -{p.discountPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<"products" | "about" | "reviews">("products");
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { data: store, isLoading, isError } = useGetStoreProfile(slug);
  const { data: reviewsData, isLoading: reviewsLoading } = useGetSellerReviews(
    store?.sellerId ?? 0,
    { query: { enabled: !!store?.sellerId && activeTab === "reviews", queryKey: getSellerReviewsQueryKey(store?.sellerId ?? 0) } }
  );

  useSEO({
    title: store
      ? lang === "ar"
        ? `متجر ${store.storeName} — سيانو`
        : `${store.storeName} Store on Syano`
      : lang === "ar" ? "متجر على سيانو" : "Store on Syano",
    description: store
      ? (store.storeDescription ||
          (lang === "ar"
            ? `تسوّق من متجر ${store.storeName} على سيانو. منتجات متنوعة، توصيل سريع، دفع آمن.`
            : `Shop ${store.storeName} on Syano — trusted Syrian seller. Browse products, fast delivery, secure checkout.`)
        ).slice(0, 160)
      : undefined,
    canonical: `/store/${slug}`,
    image: store?.storeLogo || undefined,
    jsonLd: store
      ? {
          "@context": "https://schema.org",
          "@type": "Store",
          "@id": `https://syano.online/store/${slug}`,
          name: store.storeName,
          description: store.storeDescription || undefined,
          url: `https://syano.online/store/${slug}`,
          logo: store.storeLogo
            ? { "@type": "ImageObject", url: store.storeLogo }
            : undefined,
          image: store.storeLogo || undefined,
          address: {
            "@type": "PostalAddress",
            addressLocality: store.city || "Aleppo",
            addressCountry: "SY",
          },
          aggregateRating:
            store.reviewCount && store.reviewCount > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: store.averageRating ?? 0,
                  reviewCount: store.reviewCount,
                }
              : undefined,
        }
      : undefined,
  });

  if (isLoading) return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-20 w-80 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    </Layout>
  );

  if (isError || !store) return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">{t("store.not_found_title")}</h2>
        <p className="text-muted-foreground mb-6">{t("store.not_found_desc")}</p>
        <Link href="/products">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180 shrink-0" />
            {t("store.browse_products")}
          </Button>
        </Link>
      </div>
    </Layout>
  );

  /* Locale-aware "Member since" date */
  const memberSinceLabel = new Date(store.memberSince).toLocaleDateString(
    lang === "ar" ? "ar-SY" : "en-US",
    { month: "short", year: "numeric" }
  );

  const tabs = [
    { key: "products" as const, label: t("store.tab_products") },
    { key: "about" as const, label: t("store.tab_about") },
    {
      key: "reviews" as const,
      label: store.sellerReviewCount > 0
        ? t("store.tab_reviews_count", { count: store.sellerReviewCount })
        : t("store.tab_reviews"),
    },
  ];

  return (
    <Layout>
      {/* ── Banner ─────────────────────────────────────────────── */}
      <div className="w-full h-44 sm:h-56 relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
        {store.storeBanner && (
          <img src={store.storeBanner} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* ── Store Identity ──────────────────────────────────── */}
        <div className="relative -mt-12 mb-4 flex items-end gap-4">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-background bg-card shadow-lg flex items-center justify-center shrink-0 overflow-hidden">
            {store.storeLogo ? (
              <img src={store.storeLogo} alt={store.storeName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-primary">
                {(store.storeName || "S").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight truncate max-w-full">
                {store.storeName}
              </h1>
              <TrustBadge level={store.trustLevel} verifiedAt={store.verifiedAt} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{store.sellerName}</p>
          </div>
        </div>

        {/* ── CTAs ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <FollowButton sellerId={store.sellerId} />
          <ContactButton sellerId={store.sellerId} />
          <Link href="/products">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180 shrink-0" />
              {t("store.back_to_products")}
            </Button>
          </Link>
        </div>

        {/* ── Stats Bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-around border rounded-2xl bg-card p-4 mb-6 flex-wrap gap-4">
          {store.averageRating != null && (
            <div className="flex flex-col items-center gap-0.5">
              <RatingStars rating={store.averageRating} size="md" />
              <span className="text-lg font-black text-foreground tabular-nums">{store.averageRating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground font-medium text-center">
                {t("store.stat_rating", { count: store.reviewCount })}
              </span>
            </div>
          )}
          <StatItem icon={Users} label={t("store.stat_followers")} value={store.followerCount.toLocaleString()} />
          <StatItem icon={Package} label={t("store.stat_products")} value={store.totalProducts.toLocaleString()} />
          <StatItem icon={ShoppingBag} label={t("store.stat_orders")} value={t("store.stat_completion", { rate: store.completionRate })} />
          <StatItem icon={Calendar} label={t("store.stat_member_since")} value={memberSinceLabel} />
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex gap-0 border-b mb-6 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Panels ─────────────────────────────────────── */}
        {activeTab === "products" && (
          <section className="pb-10">
            <StoreProducts sellerId={store.sellerId} />
          </section>
        )}

        {activeTab === "about" && (
          <section className="pb-10 space-y-5 max-w-2xl">
            {store.storeDescription && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("store.about_title")}
                </h3>
                <p className="text-foreground/80 leading-relaxed">{store.storeDescription}</p>
              </div>
            )}
            {store.categories && store.categories.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("store.categories_title")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {store.categories.map((cat: string) => (
                    <Badge key={cat} variant="secondary">{cat}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {store.city && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" /><span>{store.city}</span>
                </div>
              )}
              {store.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                    {store.website}
                  </a>
                </div>
              )}
            </div>
            {store.sellerScore != null && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t("store.seller_score")}</span>
                </div>
                <div className="text-store-stat text-emerald-700 dark:text-emerald-400">
                  {store.sellerScore}/5
                </div>
                <p className="text-xs text-emerald-600/80 mt-1">
                  {t("store.seller_score_based", { count: store.sellerReviewCount })}
                </p>
              </div>
            )}
          </section>
        )}

        {activeTab === "reviews" && (
          <section className="pb-10 space-y-4">
            {reviewsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
            ) : reviewsData?.reviews.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("store.no_reviews")}</p>
                <p className="text-sm mt-1">{t("store.no_reviews_desc")}</p>
              </div>
            ) : (
              <>
                {reviewsData?.summary && reviewsData.summary.total > 0 && (
                  <div className="p-4 border rounded-2xl bg-card mb-6 flex flex-wrap gap-6 items-center">
                    <div className="text-center">
                      <div className="text-review-score">{reviewsData.summary.overallScore?.toFixed(1) ?? "—"}</div>
                      <p className="text-xs text-muted-foreground mt-1">{t("store.overall_score")}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 text-sm min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-28 shrink-0">{t("store.communication")}</span>
                        <RatingStars rating={reviewsData.summary.avgCommunication ?? 0} />
                        <span className="font-bold">{reviewsData.summary.avgCommunication?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-28 shrink-0">{t("store.shipping")}</span>
                        <RatingStars rating={reviewsData.summary.avgShipping ?? 0} />
                        <span className="font-bold">{reviewsData.summary.avgShipping?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-28 shrink-0">{t("store.professionalism")}</span>
                        <RatingStars rating={reviewsData.summary.avgProfessionalism ?? 0} />
                        <span className="font-bold">{reviewsData.summary.avgProfessionalism?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {reviewsData?.reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
