import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Product } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard = React.memo(function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const colors = useColors();

  const hasDiscount =
    product.discountPercent != null && product.discountPercent > 0;

  return (
    <Pressable
      testID="product-card"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="cube-outline" size={40} color={colors.mutedForeground} />
        )}
        {hasDiscount && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
              -{product.discountPercent}%
            </Text>
          </View>
        )}
        {product.stock === 0 && (
          <View style={[styles.outOfStock, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.category, { color: colors.primary }]}
          numberOfLines={1}
        >
          {product.category}
        </Text>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
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
        {onAddToCart && product.stock > 0 && (
          <Pressable
            testID="add-to-cart-btn"
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => onAddToCart(product)}
          >
            <Ionicons name="cart-outline" size={16} color={colors.primaryForeground} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  outOfStock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  info: {
    padding: 10,
    gap: 3,
  },
  category: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addBtn: {
    marginTop: 6,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    alignSelf: "flex-end",
  },
});
