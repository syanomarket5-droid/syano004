import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { OrderCard } from "@/components/OrderCard";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useScreenLayout } from "@/hooks/useScreenLayout";
import { t } from "../../src/i18n";

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const STATUS_NEXT: Record<string, OrderStatus | null> = {
  pending: "processing",
  processing: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  processing: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

export default function OrdersScreen() {
  const { isSeller } = useAuth();
  const colors = useColors();
  const { topPad, tabBarHeight } = useScreenLayout();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const { data: orders = [], isLoading, refetch, isRefetching } = useListOrders();
  const updateStatus = useUpdateOrderStatus();

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const handleAdvanceStatus = useCallback((order: Order) => {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    updateStatus.mutate({ id: order.id, data: { status: next } });
  }, [updateStatus]);

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <Pressable onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(item.id) } } as Href)}>
      <OrderCard order={item}>
        {isSeller && STATUS_NEXT[item.status] && (
          <Pressable
            testID={`advance-order-${item.id}`}
            style={({ pressed }) => [
              styles.advanceBtn,
              {
                backgroundColor: STATUS_COLOR[STATUS_NEXT[item.status]!] ?? colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => handleAdvanceStatus(item)}
            disabled={updateStatus.isPending}
          >
            <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
            <Text style={styles.advanceBtnText}>
              Mark as {STATUS_NEXT[item.status]}
            </Text>
          </Pressable>
        )}
        {isSeller && item.status === "pending" && (
          <Pressable
            testID={`cancel-order-${item.id}`}
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                borderColor: colors.destructive,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() =>
              updateStatus.mutate({ id: item.id, data: { status: "cancelled" } })
            }
            disabled={updateStatus.isPending}
          >
            <Text style={[styles.cancelText, { color: colors.destructive }]}>
              Cancel Order
            </Text>
          </Pressable>
        )}
        {isSeller && (
          <Text style={[styles.customerInfo, { color: colors.mutedForeground }]}>
            <Ionicons name="person-outline" size={12} /> {item.customerName} · {item.shippingAddress}
          </Text>
        )}
      </OrderCard>
    </Pressable>
  ), [isSeller, colors, updateStatus.isPending, handleAdvanceStatus]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
      </View>

      <View style={[styles.filterRow]}>
        <FlatList
          data={["all", ...ORDER_STATUSES] as const}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterScroll}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor:
                    filter === item ? colors.primary : colors.secondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => setFilter(item as OrderStatus | "all")}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      filter === item
                        ? colors.primaryForeground
                        : colors.foreground,
                  },
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {filter === "all" ? t("orders.empty") : t("orders.empty_filter", { status: filter })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarHeight },
          ]}
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={16}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={renderOrderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: "700" as const },
  filterRow: { paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: { fontSize: 13, fontWeight: "500" as const },
  list: { padding: 16, gap: 10 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 15 },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  advanceBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" as const },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  cancelText: { fontSize: 13, fontWeight: "500" as const },
  customerInfo: { fontSize: 12, marginTop: 4 },
});
