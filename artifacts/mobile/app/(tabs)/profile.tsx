import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useGetCustomerDashboard,
  useGetSellerDashboard,
  useGetFollowingStores,
  getGetCustomerDashboardQueryKey,
  getGetSellerDashboardQueryKey,
  getFollowingStoresQueryKey,
  type FollowingStore,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useScreenLayout } from "@/hooks/useScreenLayout";
import { t } from "../../src/i18n";

export default function ProfileScreen() {
  const colors = useColors();
  const { topPad, tabBarHeight } = useScreenLayout();
  const { user, logout, isSeller, isCustomer } = useAuth();

  const customerDash = useGetCustomerDashboard({ query: { enabled: isCustomer, queryKey: getGetCustomerDashboardQueryKey() } });
  const sellerDash = useGetSellerDashboard({ query: { enabled: isSeller, queryKey: getGetSellerDashboardQueryKey() } });
  const followingStores = useGetFollowingStores({ query: { enabled: isCustomer, queryKey: getFollowingStoresQueryKey() } });

  async function handleLogout() {
    Alert.alert(t("profile.sign_out_title"), t("profile.sign_out_msg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.sign_out_btn"),
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const stats = isSeller
    ? [
        { label: t("profile.stat_products"), value: sellerDash.data?.totalProducts ?? "-", icon: "cube-outline" as const },
        { label: t("profile.stat_orders"), value: sellerDash.data?.totalOrders ?? "-", icon: "receipt-outline" as const },
        { label: t("profile.stat_revenue"), value: sellerDash.data ? `$${sellerDash.data.totalRevenue.toFixed(0)}` : "-", icon: "cash-outline" as const },
      ]
    : [
        { label: t("profile.stat_orders"), value: customerDash.data?.totalOrders ?? "-", icon: "receipt-outline" as const },
        { label: t("profile.stat_delivered"), value: customerDash.data?.deliveredOrders ?? "-", icon: "checkmark-circle-outline" as const },
        { label: t("profile.stat_spent"), value: customerDash.data ? `$${customerDash.data.totalSpent.toFixed(0)}` : "-", icon: "cash-outline" as const },
      ];

  const stores = followingStores.data ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 16,
          paddingBottom: tabBarHeight + 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar card ──────────────────────────────────── */}
      <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
            {user?.email}
          </Text>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: isSeller ? "#052E16" : "#EFF6FF",
              },
            ]}
          >
            <Ionicons
              name={isSeller ? "storefront-outline" : "person-outline"}
              size={12}
              color={isSeller ? "#10B981" : "#3B82F6"}
            />
            <Text
              style={[
                styles.roleText,
                { color: isSeller ? "#10B981" : "#3B82F6" },
              ]}
            >
              {isSeller ? t("profile.role_seller") : t("profile.role_customer")}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Stats ────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View
            key={s.label}
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name={s.icon} size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {String(s.value)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Following Stores (customers only) ────────────── */}
      {isCustomer && stores.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("profile.following_stores")}
          </Text>
          <View style={styles.storesList}>
            {stores.map((store: import("@workspace/api-client-react").FollowingStore) => (
              <StoreFollowItem key={store.sellerId} store={store} colors={colors} />
            ))}
          </View>
        </View>
      )}

      {/* ── Menu ─────────────────────────────────────────── */}
      <View style={styles.menuSection}>
        <MenuItem
          icon="receipt-outline"
          label={t("profile.menu_orders")}
          onPress={() => router.push("/(tabs)/orders")}
          colors={colors}
        />
        {isCustomer && (
          <MenuItem
            icon="cart-outline"
            label={t("profile.menu_cart")}
            onPress={() => router.push("/(tabs)/cart")}
            colors={colors}
          />
        )}
        <MenuItem
          icon="chatbubbles-outline"
          label={t("profile.menu_messages")}
          onPress={() => router.push("/(tabs)/messages")}
          colors={colors}
        />
        {isSeller && (
          <MenuItem
            icon="analytics-outline"
            label={t("profile.menu_dashboard")}
            onPress={() => router.push("/(tabs)")}
            colors={colors}
          />
        )}
      </View>

      {/* ── Sign out ──────────────────────────────────────── */}
      <Pressable
        testID="logout-btn"
        style={({ pressed }) => [
          styles.logoutBtn,
          {
            backgroundColor: colors.card,
            borderColor: colors.destructive,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>{t("profile.sign_out")}</Text>
      </Pressable>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        Syano · v1.0.0
      </Text>
    </ScrollView>
  );
}

function StoreFollowItem({
  store,
  colors,
}: {
  store: FollowingStore;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const initial = store.storeName?.charAt(0)?.toUpperCase() ?? "S";
  const trustColor =
    store.trustLevel === "trusted"
      ? "#10B981"
      : store.trustLevel === "verified"
      ? "#3B82F6"
      : colors.mutedForeground;

  return (
    <View style={[styles.storeItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.storeAvatar, { backgroundColor: colors.muted }]}>
        {store.storeLogo ? (
          <Image source={{ uri: store.storeLogo }} style={styles.storeLogoImg} resizeMode="cover" />
        ) : (
          <Text style={[styles.storeInitial, { color: colors.primary }]}>{initial}</Text>
        )}
      </View>
      <View style={styles.storeMeta}>
        <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
          {store.storeName ?? t("profile.unknown_store")}
        </Text>
        {store.trustLevel && store.trustLevel !== "new" && (
          <View style={styles.trustRow}>
            <Ionicons
              name={store.trustLevel === "trusted" ? "shield-checkmark" : "checkmark-circle"}
              size={11}
              color={trustColor}
            />
            <Text style={[styles.trustLabel, { color: trustColor }]}>
              {store.trustLevel.charAt(0).toUpperCase() + store.trustLevel.slice(1)}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 24, fontWeight: "700" as const },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 18, fontWeight: "700" as const },
  userEmail: { fontSize: 13 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 3,
  },
  roleText: { fontSize: 11, fontWeight: "600" as const },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700" as const },
  statLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, marginBottom: 8 },
  storesList: { gap: 8 },
  storeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  storeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  storeLogoImg: { width: 40, height: 40 },
  storeInitial: { fontSize: 16, fontWeight: "700" as const },
  storeMeta: { flex: 1, gap: 2 },
  storeName: { fontSize: 14, fontWeight: "600" as const },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  trustLabel: { fontSize: 11, fontWeight: "500" as const },
  menuSection: { gap: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500" as const },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  logoutText: { fontSize: 15, fontWeight: "600" as const },
  version: { fontSize: 12, textAlign: "center" },
});
