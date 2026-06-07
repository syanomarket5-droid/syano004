import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useGetProduct, useAddToCart, getGetCartQueryKey, useStartConversation } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useGuestCart } from "@/contexts/GuestCartContext";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Minus, Plus, ShoppingCart, Truck, ShieldCheck, RefreshCw, // RefreshCw kept for future re-enable
  ZoomIn, X, AlertTriangle, ChevronRight, Package, Star, MessageCircle
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { FEATURES } from "@/lib/features";
import { StarRating } from "@/components/StarRating";
import { ReviewSection } from "@/components/ReviewSection";
import { RelatedProducts } from "@/components/RelatedProducts";
import { useSEO } from "@/hooks/useSEO";
import { OptimizedImage } from "@/components/OptimizedImage";

/* ── Contact Seller Button ───────────────────────────────────── */
function ContactSellerButton({ sellerId, className }: { sellerId: number; className?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const startConv = useStartConversation();

  const handleContact = () => {
    startConv.mutate(
      { sellerId },
      {
        onSuccess: () => navigate("/messages"),
        onError: () =>
          toast({ title: t("common.error"), description: t("product.contact_error"), variant: "destructive" }),
      }
    );
  };

  return (
    <button
      onClick={handleContact}
      disabled={startConv.isPending}
      className={`w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-semibold text-foreground transition-colors disabled:opacity-60 ${className ?? ""}`}
    >
      <MessageCircle className="h-4 w-4 text-primary" />
      Contact Seller
    </button>
  );
}

function ProductSkeleton() {
  return (
    <Layout>
      <div className="container py-5 md:py-10">
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
          <div className="space-y-3">
            <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
            <div className="flex gap-2">
              {[0,1,2,3].map(i => (
                <div key={i} className="h-16 w-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded w-4/5 animate-pulse" />
            <div className="h-9 bg-muted rounded w-3/5 animate-pulse" />
            <div className="h-5 w-28 bg-muted rounded animate-pulse" />
            <div className="h-14 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded-xl animate-pulse" />
            <div className="h-28 bg-muted rounded-xl animate-pulse" />
            <div className="h-20 bg-muted rounded-xl animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => (
                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ProductDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { isCustomer, isAuthenticated } = useAuth();
  const { addGuestItem } = useGuestCart();
  const { format } = useCurrency();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [activeImageOverride, setActiveImage] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  const { data: product, isLoading, error } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: ["getProduct", id] }
  });

  const addToCart = useAddToCart({
    mutation: {
      onSuccess: () => {
        toast({
          title: t("product_detail.added_to_cart"),
          description: t("product_detail.added_desc", { qty: quantity, name: product?.name }),
        });
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      },
      onError: () => {
        toast({
          title: t("common.error"),
          description: t("product_detail.error_add"),
          variant: "destructive",
        });
      }
    }
  });

  const hasVariants = (product?.variantGroups?.length ?? 0) > 0;

  const resolvedVariant = useMemo(() => {
    if (!product || !hasVariants || !product.variants?.length) return null;
    const numGroups = product.variantGroups!.length;
    if (Object.keys(selectedOptions).length < numGroups) return null;
    const selectedOptionIds = new Set(Object.values(selectedOptions));
    return (
      product.variants.find(
        (v) => v.options.length === numGroups && v.options.every((o) => selectedOptionIds.has(o.optionId))
      ) ?? null
    );
  }, [selectedOptions, product, hasVariants]);

  function isOptionAvailable(groupId: number, optionId: number): boolean {
    if (!product?.variants?.length) return true;
    const test = { ...selectedOptions, [groupId]: optionId };
    const testIds = new Set(Object.values(test));
    return product.variants.some(
      (v) =>
        v.active &&
        v.stock > 0 &&
        v.options.some((o) => o.optionId === optionId) &&
        (Object.keys(test).length < (product.variantGroups?.length ?? 0) ||
          (v.options.length === (product.variantGroups?.length ?? 0) &&
            v.options.every((o) => testIds.has(o.optionId))))
    );
  }

  const handleAddToCart = () => {
    if (!product) return;
    if (hasVariants && !resolvedVariant) return;
    addToCart.mutate({
      data: { productId: product.id, quantity, ...(resolvedVariant ? { variantId: resolvedVariant.id } : {}) } as any,
    });
  };

  // First group (e.g. Color) drives automatic gallery switching
  const firstGroup = product?.variantGroups?.[0];
  const selectedFirstOptionId = firstGroup ? (selectedOptions[firstGroup.id] ?? null) : null;

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const productImgs = [...new Set(
      [product.imageUrl, ...(product.imageUrls ?? [])].filter(Boolean) as string[]
    )];
    if (!hasVariants || !product.variants?.length) return productImgs;

    if (selectedFirstOptionId != null) {
      const seen = new Set<string>();
      const imgs: string[] = [];
      for (const v of product.variants as any[]) {
        if (!v.options?.some((o: any) => o.optionId === selectedFirstOptionId)) continue;
        for (const img of (v.images ?? [])) {
          const url = (typeof img === "string" ? img : img?.url) as string | undefined;
          if (url && !seen.has(url)) { seen.add(url); imgs.push(url); }
        }
        if (v.imageUrl && !seen.has(v.imageUrl)) { seen.add(v.imageUrl); imgs.push(v.imageUrl); }
      }
      if (imgs.length > 0) return imgs;
    }

    if (resolvedVariant) {
      const vImgs = ((resolvedVariant as any).images ?? [])
        .map((i: any) => (typeof i === "string" ? i : i?.url))
        .filter(Boolean) as string[];
      if (vImgs.length > 0) return vImgs;
      if ((resolvedVariant as any).imageUrl) return [(resolvedVariant as any).imageUrl, ...productImgs];
    }

    return productImgs;
  }, [product, hasVariants, selectedFirstOptionId, resolvedVariant]);

  const allImages = galleryImages;
  const activeImage = activeImageOverride ?? allImages[0] ?? null;

  // Reset active image when first-group selection changes (gallery switch)
  useEffect(() => {
    setActiveImage(null);
    setImgLoaded(false);
  }, [selectedFirstOptionId]);

  // Sync selected options to URL query params (?Color=Red&Size=M)
  useEffect(() => {
    if (!product?.variantGroups) return;
    const params = new URLSearchParams();
    for (const group of product.variantGroups as any[]) {
      const optionId = selectedOptions[group.id];
      if (optionId) {
        const option = (group.options as any[]).find((o: any) => o.id === optionId);
        if (option) params.set(group.name, option.value);
      }
    }
    const qs = params.toString();
    const newUrl = `/products/${id}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [selectedOptions, id]);

  const handleBuyNow = () => {
    if (!product) return;
    if (hasVariants && !resolvedVariant) return;
    addToCart.mutate(
      { data: { productId: product.id, quantity, ...(resolvedVariant ? { variantId: resolvedVariant.id } : {}) } as any },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }); navigate("/cart"); } }
    );
  };

  const handleGuestAddToCart = () => {
    if (!product || (hasVariants && !resolvedVariant)) return;
    addGuestItem(product.id, resolvedVariant?.id ?? null, quantity);
    toast({
      title: t("product_detail.added_to_cart"),
      description: t("product_detail.added_desc", { qty: quantity, name: product.name }),
    });
  };

  const handleGuestBuyNow = () => {
    if (!product || (hasVariants && !resolvedVariant)) return;
    addGuestItem(product.id, resolvedVariant?.id ?? null, quantity);
    navigate("/cart");
  };

  const decreaseQuantity = () => { if (quantity > 1) setQuantity(quantity - 1); };
  const increaseQuantity = () => {
    const maxStock = hasVariants ? (resolvedVariant?.stock ?? 0) : (product?.stock ?? 0);
    if (product && quantity < maxStock) setQuantity(quantity + 1);
  };

  useSEO(
    product
      ? {
          title: product.name,
          description:
            (product.description || "").slice(0, 160) ||
            `Buy ${product.name} on Syano — ${product.category}. Trusted Syrian sellers, fast delivery, secure checkout.`,
          canonical: `/products/${product.id}`,
          image: product.imageUrl || undefined,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description || undefined,
            image: product.imageUrl || undefined,
            category: product.category,
            brand: product.sellerName
              ? { "@type": "Brand", name: product.sellerName }
              : undefined,
            aggregateRating:
              product.reviewCount && product.reviewCount > 0
                ? {
                    "@type": "AggregateRating",
                    ratingValue: product.averageRating ?? 0,
                    reviewCount: product.reviewCount,
                  }
                : undefined,
            offers: {
              "@type": "Offer",
              url: `https://syano.online/products/${product.id}`,
              price: product.finalPrice ?? product.price,
              priceCurrency: "USD",
              availability:
                product.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
          },
        }
      : { title: "Loading product", canonical: `/products/${id}` },
  );

  if (isLoading) return <ProductSkeleton />;

  if (error || !product) {
    return (
      <Layout>
        <div className="container flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t("product_detail.not_found")}</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">{t("product_detail.not_found_desc")}</p>
          <Link href="/products">
            <Button size="lg">{t("product_detail.back_to_products")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // ── Absolute price model (Shopify/Amazon style) ──
  // variant.price = absolute sell price; variant.compareAtPrice = crossed-out original price
  const effectiveSellPrice: number = (() => {
    if (hasVariants && resolvedVariant) {
      const v = resolvedVariant as any;
      if (v.price != null) return parseFloat(v.price);
      // Legacy: priceAdjustment + product-level discount
      return parseFloat(((product.price + (v.priceAdjustment ?? 0)) * (1 - (product.discountPercent ?? 0) / 100)).toFixed(2));
    }
    return product.finalPrice ?? product.price;
  })();

  const effectiveCompareAt: number | null = (() => {
    if (hasVariants && resolvedVariant) {
      const v = resolvedVariant as any;
      if (v.compareAtPrice != null) return parseFloat(v.compareAtPrice);
      if (v.price != null) return null; // absolute price, no compare = no strikethrough
      // Legacy: show base before discount
      if ((product.discountPercent ?? 0) > 0) return product.price + (v.priceAdjustment ?? 0);
      return null;
    }
    if ((product.discountPercent ?? 0) > 0) return product.price;
    return null;
  })();

  const effectiveFinalPrice = effectiveSellPrice;
  const effectiveBasePrice  = effectiveCompareAt ?? effectiveSellPrice;
  const hasDiscount         = effectiveCompareAt != null && effectiveCompareAt > effectiveSellPrice;
  const savings             = hasDiscount ? effectiveCompareAt - effectiveSellPrice : 0;
  const displayDiscountPct  = hasDiscount && effectiveCompareAt
    ? Math.round((1 - effectiveSellPrice / effectiveCompareAt) * 100)
    : (product.discountPercent ?? 0);
  const effectiveStock = hasVariants ? (resolvedVariant?.stock ?? 0) : product.stock;
  const isLowStock = hasVariants
    ? (resolvedVariant !== null && resolvedVariant.stock > 0 && resolvedVariant.stock <= 5)
    : (product.stock > 0 && product.stock <= 5);
  const isOutOfStock = hasVariants
    ? (!resolvedVariant || resolvedVariant.stock === 0 || !resolvedVariant.active)
    : product.stock === 0;
  const needsVariantSelection = hasVariants && Object.keys(selectedOptions).length < (product.variantGroups?.length ?? 0);
  const sellerInitial = (product.storeName || product.sellerName || "S").charAt(0).toUpperCase();

  const ActionButtons = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {isCustomer ? (
        <>
          <Button
            className="w-full h-12 text-base font-semibold shadow-sm"
            onClick={handleAddToCart}
            disabled={addToCart.isPending || isOutOfStock || needsVariantSelection}
          >
            <ShoppingCart className="me-2 h-5 w-5" />
            {addToCart.isPending
              ? t("product_detail.adding")
              : needsVariantSelection
                ? t("product_detail.select_options", "Select Options")
                : t("product_detail.add_to_cart")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base font-semibold"
            onClick={handleBuyNow}
            disabled={addToCart.isPending || isOutOfStock || needsVariantSelection}
          >
            {t("product_detail.buy_now")}
          </Button>
        </>
      ) : !isAuthenticated ? (
        <>
          <Button
            className="w-full h-12 text-base font-semibold shadow-sm"
            onClick={handleGuestAddToCart}
            disabled={isOutOfStock || needsVariantSelection}
          >
            <ShoppingCart className="me-2 h-5 w-5" />
            {needsVariantSelection
              ? t("product_detail.select_options", "Select Options")
              : t("product_detail.add_to_cart")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base font-semibold"
            onClick={handleGuestBuyNow}
            disabled={isOutOfStock || needsVariantSelection}
          >
            {t("product_detail.buy_now")}
          </Button>
        </>
      ) : (
        <Button className="w-full h-12 text-base font-semibold" disabled>
          {t("product_detail.sellers_cannot_buy")}
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      {/* Lightbox */}
      {lightboxOpen && activeImage && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 end-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={activeImage}
            alt={product.name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="container py-5 md:py-10 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 md:mb-8 flex-wrap">
          <Link href="/products" className="hover:text-foreground transition-colors flex items-center gap-0.5">
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t("product_detail.back")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground transition-colors capitalize">
            {product.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
          {/* ── Image Column ── */}
          <div className="flex flex-col space-y-3">
            {/* Main image */}
            <div
              className="relative aspect-square bg-card border rounded-2xl overflow-hidden shadow-sm group cursor-zoom-in select-none"
              onClick={() => activeImage && setLightboxOpen(true)}
            >
              {hasDiscount && (
                <Badge className="absolute top-3 end-3 z-10 bg-red-500 hover:bg-red-500 text-white text-xs font-bold shadow-md px-2.5 py-1">
                  -{product.discountPercent}%
                </Badge>
              )}

              {activeImage ? (
                <>
                  {!imgLoaded && (
                    <div className="absolute inset-0 bg-muted animate-pulse" />
                  )}
                  <img
                    src={activeImage}
                    alt={product.name}
                    className={`w-full h-full object-contain transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setImgLoaded(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-3">
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                  <span className="text-sm text-muted-foreground">{t("product_detail.no_image")}</span>
                </div>
              )}

              {/* Zoom hint */}
              {activeImage && (
                <div className="absolute bottom-3 end-3 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Thumbnail strip — real gallery images */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setActiveImage(img); setImgLoaded(false); }}
                    className={`h-16 w-16 rounded-xl border-2 overflow-hidden bg-card shrink-0 transition-all ${
                      activeImage === img
                        ? "border-primary shadow-sm"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info Column ── */}
          <div className="flex flex-col">
            {/* Category tag */}
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="self-start mb-2"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                {product.category}
              </span>
            </Link>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
              {product.name}
            </h1>

            {/* Rating row */}
            <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
              <StarRating rating={product.averageRating ?? 0} size="md" />
              {product.reviewCount > 0 ? (
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <span className="font-semibold text-foreground">{(product.averageRating ?? 0).toFixed(1)}</span>
                  {" "}
                  <span className="underline underline-offset-2">
                    ({product.reviewCount === 1
                      ? t("reviews.based_on", { count: product.reviewCount })
                      : t("reviews.based_on_plural", { count: product.reviewCount })})
                  </span>
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">{t("reviews.no_reviews")}</span>
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-product-price text-foreground leading-none" translate="no">
                  {format(effectiveFinalPrice)}
                </span>
                {hasDiscount && effectiveCompareAt != null && (
                  <span className="text-xl text-muted-foreground line-through pb-0.5 font-medium" translate="no">
                    {format(effectiveCompareAt)}
                  </span>
                )}
              </div>
              {hasDiscount && savings > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
                    -{displayDiscountPct}% {t("products.off")}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("product_detail.save", { amount: format(savings) })}
                  </span>
                </div>
              )}
            </div>

            {/* SKU display (when variant selected) */}
            {resolvedVariant && (resolvedVariant as any).sku && (
              <p className="text-xs text-muted-foreground -mt-1 mb-4">
                SKU: <span className="font-mono text-foreground" translate="no">{(resolvedVariant as any).sku}</span>
              </p>
            )}

            {/* Variant Selector */}
            {hasVariants && product.variantGroups && product.variantGroups.length > 0 && (
              <div className="mb-5 space-y-4">
                {product.variantGroups.map((group) => {
                  const selectedOptionId = selectedOptions[group.id];
                  const selectedOption = group.options.find((o) => o.id === selectedOptionId);
                  return (
                    <div key={group.id}>
                      <div className="text-sm font-medium mb-2">
                        <span className="text-muted-foreground">{group.name}:</span>
                        {selectedOption && (
                          <span className="ms-2 font-semibold text-foreground">{selectedOption.value}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((option) => {
                          const isSelected = selectedOptions[group.id] === option.id;
                          const available = isOptionAvailable(group.id, option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                if (!available) return;
                                setSelectedOptions((prev) => ({ ...prev, [group.id]: option.id }));
                              }}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : available
                                    ? "border-border hover:border-primary/60 hover:bg-primary/5 text-foreground"
                                    : "border-border opacity-40 cursor-not-allowed text-muted-foreground line-through"
                              }`}
                            >
                              {option.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stock status */}
            <div className="mb-5">
              {isOutOfStock && !needsVariantSelection ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  {t("product_detail.out_of_stock")}
                </span>
              ) : needsVariantSelection ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  {t("product_detail.select_options", "Select all options to continue")}
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {t("product_detail.only_left", { count: effectiveStock })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  {t("product_detail.in_stock", { count: effectiveStock })}
                </span>
              )}
            </div>

            {/* Seller trust card */}
            {(product as any).storeSlug ? (
              <Link href={`/store/${(product as any).storeSlug}`}>
                <div className="flex items-center gap-3 mb-3 p-4 bg-muted/30 rounded-2xl border border-border/60 hover:border-primary/30 transition-colors group cursor-pointer">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors overflow-hidden">
                    {(product as any).storeLogo
                      ? <img src={(product as any).storeLogo} alt="" className="w-full h-full object-cover" />
                      : <span className="text-base font-black text-primary">{sellerInitial}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {product.storeName || product.sellerName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {t("seller.verified")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("product_detail.sold_by")} {product.sellerName}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-180" />
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 mb-3 p-4 bg-muted/30 rounded-2xl border border-border/60">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-base font-black text-primary">{sellerInitial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-foreground">{product.storeName || product.sellerName}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("product_detail.sold_by")} {product.sellerName}</p>
                </div>
              </div>
            )}
            {/* Contact seller button — customers only */}
            {isCustomer && (product as any).storeSlug && (
              <ContactSellerButton sellerId={(product as any).sellerId} className="mb-5" />
            )}

            {/* Action box */}
            {(!isOutOfStock || needsVariantSelection) ? (
              <div className="bg-card border rounded-2xl p-5 shadow-sm mb-6 space-y-4">
                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">{t("product_detail.quantity", "Qty")}</span>
                  <div className="flex items-center border rounded-xl h-11 overflow-hidden">
                    <button
                      className="px-4 flex items-center justify-center hover:bg-muted/50 transition-colors h-full text-muted-foreground hover:text-foreground disabled:opacity-40"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 font-bold text-base min-w-[3rem] text-center tabular-nums">{quantity}</span>
                    <button
                      className="px-4 flex items-center justify-center hover:bg-muted/50 transition-colors h-full text-muted-foreground hover:text-foreground disabled:opacity-40"
                      onClick={increaseQuantity}
                      disabled={quantity >= effectiveStock || needsVariantSelection}
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <ActionButtons />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-6 p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/40">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">{t("product_detail.out_of_stock")}</span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-6 text-muted-foreground text-sm sm:text-base leading-relaxed">
                <p className="font-medium text-foreground mb-1.5 text-sm">{t("product_detail.description", "About this item")}</p>
                <p className="leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Delivery & trust guarantees */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 border-t pt-5">
              {[
                { icon: Truck, title: t("product_detail.fast_shipping"), desc: t("product_detail.fast_shipping_desc") },
                { icon: ShieldCheck, title: t("product_detail.secure_payment"), desc: t("product_detail.secure_payment_desc") },
                // RETURNS_ENABLED: hidden until feature launches — do not delete
                ...(FEATURES.RETURNS_ENABLED ? [{ icon: RefreshCw, title: t("product_detail.easy_returns"), desc: t("product_detail.easy_returns_desc") }] : []),
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center text-center p-3 sm:p-4 bg-muted/30 rounded-2xl gap-2 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-bold leading-tight">{title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug hidden sm:block">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Reviews — before You May Also Like */}
        <div id="reviews-section">
          <ReviewSection
            productId={product.id}
            averageRating={product.averageRating}
            reviewCount={product.reviewCount}
          />
        </div>

        {/* You May Also Like */}
        <RelatedProducts currentId={product.id} category={product.category} />
      </div>

    </Layout>
  );
}

