import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useGetConversations,
  getConversationsQueryKey,
  useGetMessages,
  useSendMessage,
  type ConversationListItem,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useScreenLayout } from "@/hooks/useScreenLayout";
import { t } from "../../src/i18n";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ConvItem = React.memo(function ConvItem({
  conv,
  active,
  onSelect,
  colors,
}: {
  conv: ConversationListItem;
  active: boolean;
  onSelect: (id: number) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const initial = conv.partnerName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.convItem,
        {
          backgroundColor: active ? colors.accent : colors.card,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={() => onSelect(conv.id)}
    >
      <View style={[styles.convAvatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.convAvatarText, { color: colors.primaryForeground }]}>
          {initial}
        </Text>
      </View>
      <View style={styles.convMeta}>
        <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
          {conv.partnerName ?? t("common.unknown")}
        </Text>
        {conv.lastMessage && (
          <Text style={[styles.convProduct, { color: colors.mutedForeground }]} numberOfLines={1}>
            {conv.lastMessage.body}
          </Text>
        )}
        <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
          {timeAgo(conv.lastMessageAt)}
        </Text>
      </View>
      {conv.unreadCount > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.unreadText, { color: colors.primaryForeground }]}>
            {conv.unreadCount}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
});

function ChatView({
  convId,
  userId,
  colors,
  onBack,
}: {
  convId: number;
  userId: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);
  const { data: msgs, isLoading } = useGetMessages(convId);
  const send = useSendMessage(convId);

  const isInitialLoadRef = useRef(true);
  useEffect(() => { isInitialLoadRef.current = true; }, [convId]);
  useEffect(() => {
    const len = msgs?.length ?? 0;
    if (len === 0) return;
    if (isInitialLoadRef.current) { isInitialLoadRef.current = false; return; }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [msgs?.length]);

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText("");
    send.mutate({ body });
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.chatContainer, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <Pressable style={[styles.backRow, { borderBottomColor: colors.border }]} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
        <Text style={[styles.backLabel, { color: colors.primary }]}>Conversations</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={msgs ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.msgList}
        removeClippedSubviews={true}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={16}
        windowSize={21}
        renderItem={({ item: m }) => {
          const mine = m.senderId === userId;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text
                style={[
                  styles.bubbleText,
                  {
                    color: mine ? colors.primaryForeground : colors.foreground,
                    backgroundColor: mine ? colors.primary : colors.card,
                  },
                  styles.bubblePad,
                  { borderColor: colors.border },
                ]}
              >
                {m.body}
              </Text>
              <Text style={[styles.bubbleTime, { color: colors.mutedForeground }]}>
                {timeAgo(m.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
          ]}
          placeholder={t("messages.type_message")}
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: text.trim() ? colors.primary : colors.muted, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const { topPad, tabBarHeight } = useScreenLayout();
  const { user, isAuthenticated } = useAuth();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);

  const handleSelectConv = useCallback((id: number) => setActiveConvId(id), []);

  const renderConvItem = useCallback(({ item: c }: { item: ConversationListItem }) => (
    <ConvItem
      conv={c}
      active={c.id === activeConvId}
      onSelect={handleSelectConv}
      colors={colors}
    />
  ), [activeConvId, handleSelectConv, colors]);

  const { data: convs, isLoading } = useGetConversations({
    query: { enabled: isAuthenticated, queryKey: getConversationsQueryKey() },
  });

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingBottom: tabBarHeight }]}>
        <Ionicons name="chatbubbles-outline" size={56} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to view messages</Text>
        <Pressable
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={[styles.signInBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (activeConvId !== null) {
    return (
      <ChatView
        convId={activeConvId}
        userId={user!.id}
        colors={colors}
        onBack={() => setActiveConvId(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !convs?.length ? (
        <View style={[styles.center, { paddingBottom: tabBarHeight }]}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Message a seller from any product page
          </Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: tabBarHeight + 8, gap: 8 }}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={16}
          windowSize={10}
          renderItem={renderConvItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: "700" as const },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  signInBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
  signInBtnText: { fontSize: 15, fontWeight: "600" as const },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  convAvatarText: { fontSize: 18, fontWeight: "700" as const },
  convMeta: { flex: 1, gap: 2 },
  convName: { fontSize: 15, fontWeight: "600" as const },
  convProduct: { fontSize: 12 },
  convTime: { fontSize: 11 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontWeight: "700" as const },
  chatContainer: { flex: 1 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    paddingTop: 52,
  },
  backLabel: { fontSize: 15, fontWeight: "500" as const },
  msgList: { padding: 16, gap: 8 },
  bubble: { maxWidth: "80%" },
  bubbleMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubblePad: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    borderWidth: 1,
    overflow: "hidden",
  },
  bubbleText: {},
  bubbleTime: { fontSize: 10, marginTop: 3, paddingHorizontal: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
