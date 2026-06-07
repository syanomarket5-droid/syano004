import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { type ComponentProps, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetOrder, useUpdateOrderStatus, useGetOrderHistory, getListOrdersQueryKey, getGetOrderHistoryQueryKey } from "@workspace/api-client-react";
import type { OrderStatusUpdateStatus, OrderHistoryEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useScreenLayout } from "@/hooks/useScreenLayout";
import { t } from "../../src/i18n";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  processing: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
  refunded: "#8B5CF6",
};

const STATUS_STEPS = ["pending", "processing", "shipped", "delivered"] as const;

const STATUS_NEXT: Record<string, string | null> = {
  pending: "processing",
  processing: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
  refunded: null,
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: t("orders.status_pending"),
    processing: t("orders.status_processing"),
    shipped: t("orders.status_shipped"),
    delivered: t("orders.status_delivered"),
    cancelled: t("orders.status_cancelled"),
    refunded: t("orders.status_refunded"),
  };
  return labels[status] ?? status;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { topPad } = useScreenLayout();
  const { isSeller, user } = useAuth();
  const queryClient = useQueryClient();
  const [trackingCopied, setTrackingCopied] = useState(false);
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (trackingTimerRef.current !== null) clearTimeout(trackingTimerRef.current);
    };
  }, []);

  const { data: order, isLoading, refetch, isRefetching } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: ["getOrder", orderId] }
  });

  const { data: history } = useGetOrderHistory(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderHistoryQueryKey(orderId) }
  });

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      }
    }
  });

  const statusColor = order ? (STATUS_COLORS[order.status] ?? colors.mutedForeground) : colors.mutedForeground;
  const currentStepIdx = order ? STATUS_STEPS.findIndex(s => s === order.status) : -1;

  function getStepTimestamp(step: string): string | null {
    if (!history) return null;
    const entry = history.find((h: OrderHistoryEntry) => h.toStatus === step);
    return entry ? formatDate(entry.createdAt) : null;
  }

  function confirmStatusChange(nextStatus: string) {
    Alert.alert(
      t("orders.mark_confirm_title", { status: getStatusLabel(nextStatus) }),
      t("orders.mark_confirm_desc"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: () => updateStatus.mutate({ id: orderId, data: { status: nextStatus as OrderStatusUpdateStatus } }),
        },
      ]
    );
  }

  function confirmCustomerCancel() {
    Alert.alert(
      t("orders.cancel_title"),
      t("orders.cancel_desc", { id: orderId }),
      [
        { text: t("orders.keep_order"), style: "cancel" },
        {
          text: t("orders.confirm_cancel"),
          style: "destructive",
          onPress: () => updateStatus.mutate({ id: orderId, data: { status: "cancelled" } }),
        },
      ]
    );
  }

  function handleCopyTracking(trackingNumber: string) {
    Share.share({ message: trackingNumber }).then(() => {
      setTrackingCopied(true);
      if (trackingTimerRef.current !== null) clearTimeout(trackingTimerRef.current);
      trackingTimerRef.current = setTimeout(() => setTrackingCopied(false), 2000);
    }).catch(() => {});
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("common.back")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t("orders.order_not_found")}</Text>
        </View>
      </View>
    );
  }

  const nextStatus = STATUS_NEXT[order.status];
  const isCancelled = order.status === "cancelled" || order.status === "refunded";

  // Customers can cancel from pending or processing
  const isCustomer = !isSeller;
  const canCustomerCancel = isCustomer && (order.status === "pending" || order.status === "processing");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("profile.order_id", { id: String(order.id) })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Status badge */}
        <View style={[styles.statusBlock, { backgroundColor: statusColor + "18", borderColor: statusColor + "44" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View>
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {getStatusLabel(order.status)}
            </Text>
            <Text style={[styles.statusDate, { color: colors.mutedForeground }]}>
              {t("orders.updated", { date: new Date(order.updatedAt).toLocaleDateString() })}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        {!isCancelled && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("orders.order_progress")}</Text>
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isLast = idx === STATUS_STEPS.length - 1;
                const timestamp = getStepTimestamp(step);
                return (
                  <View key={step} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        isDone ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border }
                      ]}>
                        {isDone && <Ionicons name={isCurrent ? "ellipse" : "checkmark"} size={10} color={colors.primaryForeground} />}
                      </View>
                      {!isLast && (
                        <View style={[styles.timelineLine, { backgroundColor: idx < currentStepIdx ? colors.primary : colors.border }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineLabel, {
                        color: isDone ? colors.foreground : colors.mutedForeground,
                        fontWeight: isCurrent ? "700" : "500",
                      }]}>
                        {getStatusLabel(step)}
                      </Text>
                      {timestamp ? (
                        <Text style={[styles.timelineHint, { color: colors.mutedForeground }]}>{timestamp}</Text>
                      ) : isCurrent ? (
                        <Text style={[styles.timelineHint, { color: colors.primary }]}>{t("orders.in_progress")}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Items */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("orders.items")}</Text>
          {order.items.map((item, idx) => (
            <View key={item.productId ?? idx} style={styles.itemRow}>
              <View style={[styles.itemImg, { backgroundColor: colors.muted }]}>
                {item.imageUrl
                  ? <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <Ionicons name="cube-outline" size={20} color={colors.mutedForeground} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.productName}</Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  ×{item.quantity} · ${item.unitPrice.toFixed(2)} {t("orders.each")}
                </Text>
              </View>
              <Text style={[styles.itemSubtotal, { color: colors.foreground }]}>${item.subtotal.toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{t("orders.order_total")}</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>${order.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("orders.delivery_info")}</Text>
          {order.city && (
            <InfoRow icon="location" label={t("orders.city")} value={order.city} colors={colors} />
          )}
          <InfoRow icon="home" label={t("orders.address")} value={order.shippingAddress} colors={colors} />
          {order.customerPhone && (
            <InfoRow icon="call" label={t("orders.phone")} value={order.customerPhone} colors={colors} />
          )}
          {order.deliveryNotes && (
            <InfoRow icon="document-text" label={t("orders.notes")} value={order.deliveryNotes} colors={colors} />
          )}
          {order.estimatedDelivery && order.status !== "delivered" && !isCancelled && (
            <InfoRow icon="calendar" label={t("orders.est_delivery")} value={new Date(order.estimatedDelivery).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} colors={colors} />
          )}
        </View>

        {/* Shipping / tracking info */}
        {(order.shippingCompany || order.trackingNumber) && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("orders.shipping_info")}</Text>
            {order.shippingCompany && (
              <InfoRow icon="cube" label={t("orders.shipping_company")} value={order.shippingCompany} colors={colors} />
            )}
            {order.trackingNumber && (
              <View style={styles.infoRow}>
                <Ionicons name="barcode-outline" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t("orders.tracking_number")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1 }}>
                    <Text style={[styles.infoValue, { color: colors.foreground, flex: 1 }]} selectable>{order.trackingNumber}</Text>
                    <Pressable
                      onPress={() => handleCopyTracking(order.trackingNumber!)}
                      style={({ pressed }) => [styles.copyBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Ionicons name={trackingCopied ? "checkmark" : "copy-outline"} size={14} color={trackingCopied ? "#10B981" : colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Seller actions */}
        {isSeller && !isCancelled && nextStatus && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("orders.seller_actions")}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.advanceBtn,
                { backgroundColor: STATUS_COLORS[nextStatus] ?? colors.primary, opacity: pressed || updateStatus.isPending ? 0.8 : 1 },
              ]}
              onPress={() => confirmStatusChange(nextStatus)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                    <Text style={styles.advanceBtnText}>{t("orders.mark_as", { status: getStatusLabel(nextStatus) })}</Text>
                  </>
              }
            </Pressable>
            {order.status === "pending" && (
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { borderColor: colors.destructive, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => confirmStatusChange("cancelled")}
                disabled={updateStatus.isPending}
              >
                <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>{t("orders.cancel_order")}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Customer cancel */}
        {canCustomerCancel && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.destructive, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={confirmCustomerCancel}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending
                ? <ActivityIndicator color={colors.destructive} size="small" />
                : <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>{t("orders.cancel_order")}</Text>
              }
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={(icon + "-outline") as IoniconName} size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" as const },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15 },
  scrollContent: { padding: 16, gap: 14 },
  statusBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 16, fontWeight: "700" as const },
  statusDate: { fontSize: 12, marginTop: 2 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 2 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row", gap: 12 },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 16, paddingTop: 1 },
  timelineLabel: { fontSize: 13 },
  timelineHint: { fontSize: 11, marginTop: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemName: { fontSize: 13, fontWeight: "500" as const, lineHeight: 18 },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemSubtotal: { fontSize: 13, fontWeight: "600" as const },
  divider: { height: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 15, fontWeight: "700" as const },
  infoRow: { flexDirection: "row", gap: 10 },
  infoLabel: { fontSize: 11, fontWeight: "500" as const },
  infoValue: { fontSize: 13, marginTop: 1, lineHeight: 18 },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  advanceBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" as const },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 13, fontWeight: "500" as const },
  copyBtn: {
    padding: 6,
    borderRadius: 6,
  },
});
