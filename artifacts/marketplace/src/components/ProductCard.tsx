import React from "react";
import { Link, useLocation } from "wouter";
import { Product, getProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Timer, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { OptimizedImage } from "@/components/OptimizedImage";
import { StarRating } from "@/components/StarRating";
import { cn } from "@/lib/utils";
import { useGuestCart } from "@/contexts/GuestCartContext";

interface ProductCardProps {
  product: Product;
  flashSaleEndsIn?: string;
}

export const ProductCard = React.memo(function ProductCard({ product, flashSaleEndsIn }: ProductCardProps) {
  const { isCustomer, isAuthenticated } = useAuth();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { addGuestItem } = useGuestCart();

  const cardRef = React.useRef<HTMLDivElement>(null);
  const prefetchedRef = React.useRef(false);

  // Prefetch product detail when card enters viewport (works on mobile too)
  React.useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !prefetchedRef.current) {
          prefetchedRef.current = true;
          queryClient.prefetchQuery({
            queryKey: getGetProductQueryKey(product.id),
            queryFn: () => getProduct(product.id),
            staleTime: 2 * 60 * 1000,
          });
        }
      },
      { threshold: 0.1, rootMargin: "100px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [product.id, queryClient]);

  const addToCart = useAddToCart({
    mutation: {
      onSuccess: () => {
        toast({
          title: t("product_detail.added_to_cart"),
          description: t("product_detail.added_desc", { qty: 1, name: product.name }),
        });
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      },
      onError: () => {
        toast({
          title: t("common.error"),
          description: t("product_detail.error_add"),
          variant: "destructive",
        });
      },
    },
  });

  // Desktop hover prefetch — skip if IntersectionObserver already handled it
  const handleMouseEnter = () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    queryClient.prefetchQuery({
      queryKey: getGetProductQueryKey(product.id),
      queryFn: () => getProduct(product.id),
      staleTime: 2 * 60 * 1000,
    });
  };

  const hasDiscount = product.discountPercent && product.discountPercent > 0;
  const avgRating = product.averageRating ?? 0;
  const reviewCount = product.reviewCount ?? 0;
  const isRated = avgRating > 0;
  const hasVariants = (product as any).hasVariants === true;

  // Authenticated customer: if product has variants, go to detail (must pick variant first)
  const handleCustomerAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      navigate(`/products/${product.id}`);
    } else {
      addToCart.mutate({ data: { productId: product.id, quantity: 1 } });
    }
  };

  // Guest: add to localStorage cart, show toast prompting sign-in for checkout
  const handleGuestAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      navigate(`/products/${product.id}`);
      return;
    }
    addGuestItem(product.id, null, 1);
    toast({
      title: t("product_detail.added_to_cart"),
      description: t("cart.guest_added_desc"),
    });
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "group flex flex-col bg-card rounded-xl border border-border overflow-hidden",
        "hover:border-primary/30 hover:-translate-y-0.5 transition-[transform,border-color] duration-150",
        "cursor-pointer h-full relative active:scale-[0.98]",
        product.stock <= 0 && "opacity-70"
      )}
      onClick={() => navigate(`/products/${product.id}`)}
      onMouseEnter={handleMouseEnter}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/products/${product.id}`)}
      aria-label={`View ${product.name}`}
    >
      {/* ── Discount badge ─────────────────────────────────── */}
      {hasDiscount && (
        <Badge className="absolute top-2 end-2 z-10 bg-primary hover:bg-primary text-primary-foreground font-bold px-1.5 py-0.5 text-[10px] sm:text-xs">
          -{product.discountPercent}%
        </Badge>
      )}

      {/* ── Product image ───────────────────────────────────── */}
      <div className="relative shrink-0">
        {product.imageUrl ? (
          <OptimizedImage
            src={product.imageUrl}
            alt={product.name}
            aspect="aspect-[3/4] sm:aspect-[4/5] md:aspect-square"
            className="group-hover:scale-105 transition-transform duration-200"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 text-muted-foreground">
                <span className="text-xs font-medium px-2 text-center">{t("product_detail.no_image")}</span>
              </div>
            }
          />
        ) : (
          <div className="aspect-[3/4] sm:aspect-[4/5] md:aspect-square w-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
            <span className="text-xs font-medium px-2 text-center">{t("product_detail.no_image")}</span>
          </div>
        )}

        {flashSaleEndsIn && (
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 tabular-nums">
            <Timer className="h-2.5 w-2.5 shrink-0" />
            <span className="opacity-80">{t("home.flash_sale_ends_in")}</span>
            <span dir="ltr">{flashSaleEndsIn}</span>
          </div>
        )}
      </div>

      {/* ── Card text body ──────────────────────────────────── */}
      <div className="p-2 sm:p-2.5 md:p-3 flex flex-col flex-1 gap-0.5">

        {/* Category chip */}
        <div className="pc-category text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {product.category}
        </div>

        {/* Title */}
        <h3 className="heading-card text-foreground pc-title group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Seller */}
        <div className="pc-meta min-w-0 overflow-hidden">
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate block">
            {t("common.by")} {product.sellerName}
          </span>
        </div>

        {/* Rating */}
        <div className="pc-rating flex items-center gap-1 min-w-0 overflow-hidden">
          {isRated ? (
            <>
              <StarRating rating={avgRating} size="sm" />
              <span className="text-[10px] font-bold text-amber-500 tabular-nums shrink-0 leading-none">
                {avgRating.toFixed(1)}
              </span>
              {reviewCount > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 leading-none">
                  ({reviewCount})
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 leading-none">
              <Star className="h-3 w-3 shrink-0" />
              {t("products.no_reviews")}
            </span>
          )}
        </div>

        {/* Price + Add-to-cart */}
        <div className="flex items-end justify-between pt-1.5 sm:pt-2 border-t border-border/60 mt-auto">
          <div className="flex flex-col gap-0.5 min-w-0">
            {hasDiscount ? (
              <>
                <span className="text-[10px] text-muted-foreground line-through leading-none" translate="no">
                  {format(product.price)}
                </span>
                <span className="font-bold text-sm sm:text-base text-foreground leading-tight" translate="no">
                  {format(product.finalPrice)}
                </span>
              </>
            ) : (
              <span className="font-bold text-sm sm:text-base text-foreground leading-tight" translate="no">
                {format(product.price)}
              </span>
            )}
          </div>

          {/* Authenticated customer add-to-cart */}
          {isCustomer && (
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shrink-0 transition-[background-color,color] duration-150"
              onClick={handleCustomerAddToCart}
              disabled={addToCart.isPending || product.stock <= 0}
              aria-label={hasVariants ? t("products.choose_options") : t("product_detail.add_to_cart")}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}

          {/* Guest add-to-cart (no login required until checkout) */}
          {!isAuthenticated && (
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shrink-0 transition-[background-color,color] duration-150"
              onClick={handleGuestAddToCart}
              disabled={product.stock <= 0}
              aria-label={t("product_detail.add_to_cart")}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stock warnings */}
        {product.stock > 0 && product.stock <= 5 && (
          <div className="mt-0.5 text-[10px] font-medium text-destructive">
            {t("products.only_left", { count: product.stock })}
          </div>
        )}
        {product.stock <= 0 && (
          <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            {t("products.out_of_stock")}
          </div>
        )}
      </div>
    </div>
  );
});
