import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useConversations } from "../src/chat/useConversations";
import { useInboxPolling } from "../src/chat/useInboxPolling";
import type { ConversationWithLastMessage } from "../src/chat/conversationStore";
import { getLocalUser } from "../src/user/userStore";

const formatTime = (timestamp: number | string | null) => {
  if (timestamp == null) return "";
  const d = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function ChatsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<Awaited<ReturnType<typeof getLocalUser>>>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const conversations = useConversations();
  useInboxPolling(user?.id ?? null, 1200);

  useEffect(() => {
    const goRegister = () => router.replace("/register" as never);
    getLocalUser()
      .then((u) => {
        if (!u) goRegister();
        else setUser(u);
      })
      .catch(goRegister)
      .finally(() => setCheckingUser(false));
  }, [router]);

  const onSelectConversation = useCallback(
    (conv: ConversationWithLastMessage) => {
      const displayName = conv.display_name ?? conv.peer_id;
      router.push({
        pathname: "/",
        params: {
          recipientId: conv.peer_id,
          recipientDisplayName: displayName,
          conversationId: String(conv.id),
        },
      } as never);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationWithLastMessage }) => {
      const displayName = item.display_name ?? item.peer_id;
      const timeStr = formatTime(item.lastMessageAt ?? item.created_at);

      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelectConversation(item)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowMain}>
            <View style={styles.titleRow}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {displayName}
              </Text>
              {item.hasUnread ? <View style={styles.unreadDot} /> : null}
            </View>
          </View>
          <Text style={styles.rowTime}>{timeStr}</Text>
        </Pressable>
      );
    },
    [onSelectConversation]
  );

  const contentReady = !checkingUser && !!user;

  const stackOptions = React.useMemo(() => {
    if (!contentReady) {
      return { headerShown: false as const };
    }
    return {
      headerShown: true,
      title: "Chats",
      headerRight: () => (
        <Pressable
          onPress={() => router.push({ pathname: "/user-search" })}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </Pressable>
      ),
    };
  }, [contentReady, router]);

  return (
    <>
      <Stack.Screen options={stackOptions} />
      {contentReady ? (
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {conversations.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Tap + to find someone and start a chat</Text>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
              data={conversations}
              keyExtractor={(c) => String(c.id)}
              renderItem={renderItem}
              keyboardDismissMode="on-drag"
            />
          )}
        </SafeAreaView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FAFF" },
  headerBtn: { padding: 8, marginRight: 4 },
  headerBtnPressed: { opacity: 0.8 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(11, 95, 255, 0.18)",
  },
  rowPressed: { opacity: 0.8 },
  rowMain: { flex: 1, minWidth: 0, marginRight: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { color: "#102A43", fontSize: 16, fontWeight: "600", flex: 1, minWidth: 0 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  rowPreview: { color: "#6B7A90", fontSize: 14, marginTop: 2 },
  rowTime: { color: "#6B7A90", fontSize: 12 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { color: "#102A43", fontSize: 18, fontWeight: "600" },
  emptySubtext: { color: "#6B7A90", fontSize: 14, marginTop: 8 },
});
