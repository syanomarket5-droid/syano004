import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useAddToCart,
  useGetProduct,
  useGetStorePreview,
  getStorePreviewQueryKey,
  useStartConversation,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { t } from "../../src/i18n";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isCustomer, isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current);
    };
  }, []);
  const [footerHeight, setFooterHeight] = useState(82);
  const [messagingPending, setMessagingPending] = useState(false);

  const { data: product, isLoading } = useGetProduct(Number(id));
  const addToCart = useAddToCart();
  const startConv = useStartConversation();

  const sellerId = product?.sellerId ?? 0;
  const { data: storePreview } = useGetStorePreview(sellerId, {
    query: { enabled: !!product && sellerId > 0, queryKey: getStorePreviewQueryKey(sellerId) },
  });

  function handleAddToCart() {
    if (!product) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart.mutate(
      { data: { productId: product.id, quantity } },
      {
        onSuccess: () => {
          setAddedFeedback(true);
          if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current);
          feedbackTimerRef.current = setTimeout(() => setAddedFeedback(false), 2000);
        },
      }
    );
  }

  function handleMessageSeller() {
    if (!product || !isAuthenticated) {
      router.push("/(auth)/login");
      return;
    }
    setMessagingPending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    startConv.mutate(
      { sellerId: product.sellerId, productId: product.id },
      {
        onSuccess: () => {
          setMessagingPending(false);
          router.push("/(tabs)/messages");
        },
        onError: () => {
          setMessagingPending(false);
          router.push("/(tabs)/messages");
        },
      }
    );
  }

  function handleFooterLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setFooterHeight(h);
  }

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.destructive }]}>Product not found</Text>
      </View>
    );
  }

  const hasDiscount = product.discountPercent != null && product.discountPercent > 0;
  const scrollBottomPad = isCustomer && product.stock > 0 ? footerHeight + bottomPad + 8 : bottomPad + 16;

  const trustColor =
    storePreview?.trustLevel === "trusted"
      ? "#10B981"
      : storePreview?.trustLevel === "verified"
      ? "#3B82F6"
      : colors.mutedForeground;

  const trustIcon =
    storePreview?.trustLevel === "trusted"
      ? "shield-checkmark"
      : storePreview?.trustLevel === "verified"
      ? "checkmark-circle"
      : "person-outline";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={({ pressed }) => [
          styles.backBtn,
          {
            top: topPad + 8,
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={colors.foreground} />
      </Pressable>

      <ScrollView
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroImage, { backgroundColor: colors.muted }]}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="cube-outline" size={80} color={colors.mutedForeground} />
          )}
          {hasDiscount && (
            <View style={[styles.discountBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.discountText, { color: colors.primaryForeground }]}>
                -{product.discountPercent}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <View style={styles.metaRow}>
            <Text style={[styles.category, { color: colors.primary }]}>
              {product.category}
            </Text>
            <View style={[styles.stockBadge, { backgroundColor: product.stock > 0 ? colors.accent : "#FEE2E2" }]}>
              <Text style={[styles.stockText, { color: product.stock > 0 ? colors.accentForeground : "#EF4444" }]}>
                {product.stock > 0 ? t("product.in_stock", { count: String(product.stock) }) : t("product.out_of_stock")}
              </Text>
            </View>
          </View>

          <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>
              ${product.finalPrice.toFixed(2)}
            </Text>
            {hasDiscount && (
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                ${product.price.toFixed(2)}
              </Text>
            )}
          </View>

          <Text style={[styles.descriptionLabel, { color: colors.foreground }]}>
            {t("product.about")}
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {product.description}
          </Text>

          {/* ── Seller Store Card ──────────────────────────────── */}
          <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sellerCardTop}>
              <View style={[styles.sellerAvatar, { backgroundColor: colors.muted }]}>
                {storePreview?.storeLogo ? (
                  <Image
                    source={{ uri: storePreview.storeLogo }}
                    style={styles.sellerLogoImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="storefront-outline" size={22} color={colors.mutedForeground} />
                )}
              </View>
              <View style={styles.sellerCardMeta}>
                <Text style={[styles.sellerCardName, { color: colors.foreground }]} numberOfLines={1}>
                  {storePreview?.storeName ?? product.sellerName}
                </Text>
                {storePreview?.trustLevel && storePreview.trustLevel !== "new" && (
                  <View style={styles.trustRow}>
                    <Ionicons name={trustIcon as any} size={13} color={trustColor} />
                    <Text style={[styles.trustLabel, { color: trustColor }]}>
                      {storePreview.trustLevel.charAt(0).toUpperCase() + storePreview.trustLevel.slice(1)} {t("product.seller_label")}
                    </Text>
                  </View>
                )}
                {storePreview?.averageRating != null && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                      {storePreview.averageRating.toFixed(1)} {t("product.reviews_count", { count: String(storePreview.reviewCount) })}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.sellerActions}>
              {isCustomer && (
                <Pressable
                  style={({ pressed }) => [
                    styles.msgBtn,
                    { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleMessageSeller}
                  disabled={messagingPending}
                >
                  {messagingPending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  )}
                  <Text style={[styles.msgBtnText, { color: colors.primary }]}>
                    {messagingPending ? t("product.opening") : t("product.message_seller")}
                  </Text>
                </Pressable>
              )}
              {storePreview?.storeSlug && (
                <Pressable
                  style={({ pressed }) => [
                    styles.storeBtn,
                    { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => router.push(`/(tabs)` as any)}
                >
                  <Ionicons name="storefront-outline" size={16} color={colors.primary} />
                  <Text style={[styles.storeBtnText, { color: colors.primary }]}>View Store</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {isCustomer && product.stock > 0 && (
        <View
          onLayout={handleFooterLayout}
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <View style={styles.qtyControl}>
            <Pressable
              style={[styles.qtyBtn, { borderColor: colors.border }]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.qtyText, { color: colors.foreground }]}>{quantity}</Text>
            <Pressable
              style={[styles.qtyBtn, { borderColor: colors.border }]}
              onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            >
              <Ionicons name="add" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <Pressable
            testID="add-to-cart-detail-btn"
            style={({ pressed }) => [
              styles.addToCartBtn,
              {
                backgroundColor: addedFeedback ? "#10B981" : colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleAddToCart}
            disabled={addToCart.isPending}
          >
            {addToCart.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons
                  name={addedFeedback ? "checkmark" : "cart-outline"}
                  size={20}
                  color={colors.primaryForeground}
                />
                <Text style={[styles.addToCartText, { color: colors.primaryForeground }]}>
                  {addedFeedback ? t("product.added") : t("product.add_to_cart", { price: (product.finalPrice * quantity).toFixed(2) })}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  errorText: { fontSize: 16 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  discountBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: { fontSize: 14, fontWeight: "700" as const },
  details: { padding: 20, gap: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { fontSize: 13, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  stockBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  stockText: { fontSize: 12, fontWeight: "500" as const },
  name: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4 },
  price: { fontSize: 28, fontWeight: "700" as const },
  originalPrice: { fontSize: 16, textDecorationLine: "line-through" },
  descriptionLabel: { fontSize: 15, fontWeight: "700" as const, marginTop: 8 },
  description: { fontSize: 14, lineHeight: 22 },
  sellerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginTop: 8,
  },
  sellerCardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  sellerLogoImg: { width: 48, height: 48 },
  sellerCardMeta: { flex: 1, gap: 3 },
  sellerCardName: { fontSize: 15, fontWeight: "700" as const },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustLabel: { fontSize: 12, fontWeight: "500" as const },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12 },
  sellerActions: { flexDirection: "row", gap: 8 },
  msgBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  msgBtnText: { fontSize: 14, fontWeight: "600" as const },
  storeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  storeBtnText: { fontSize: 14, fontWeight: "600" as const },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 17, fontWeight: "700" as const, minWidth: 24, textAlign: "center" },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  addToCartText: { fontSize: 15, fontWeight: "700" as const },
});
