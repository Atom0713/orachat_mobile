import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getOrCreateConversation, setConversationDisplayName } from "../src/chat/conversationStore";
import { inMemoryMessageStore, useMessages } from "../src/chat/inMemoryMessageStore";
import { createPollingTransport } from "../src/chat/transport";
import type { ChatMessage } from "../src/chat/types";
import { useChatPolling } from "../src/chat/useChatPolling";
import { Theme } from "../src/theme/colors";
import { getLocalUser, type LocalUser } from "../src/user/userStore";

export default function Index() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { recipientId, recipientDisplayName, conversationId: conversationIdParam } =
    useLocalSearchParams<{
      recipientId?: string;
      recipientDisplayName?: string;
      conversationId?: string;
    }>();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedConversationId, setResolvedConversationId] = useState<number | null>(null);

  useEffect(() => {
    const goRegister = () => router.replace("/register" as never);
    getLocalUser()
      .then((u) => {
        if (!u) goRegister();
        else setUser(u);
      })
      .catch(goRegister)
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!recipientId || !user || conversationIdParam != null) return;
    getOrCreateConversation(recipientId).then((conv) => {
      setResolvedConversationId(conv.id);
    });
  }, [recipientId, user, conversationIdParam]);

  const conversationId = conversationIdParam != null
    ? parseInt(conversationIdParam, 10)
    : resolvedConversationId;

  const transport = React.useMemo(() => {
    if (!user || !recipientId || conversationId == null || Number.isNaN(conversationId))
      return null;
    return createPollingTransport({
      senderId: user.id,
      recipientId,
      conversationId,
    });
  }, [user?.id, recipientId, conversationId]);

  const messages = useMessages();
  const filteredMessages = React.useMemo(() => {
    if (conversationId == null || Number.isNaN(conversationId)) return [];
    return messages.filter((m) => m.conversationId === conversationId);
  }, [messages, conversationId]);
  const [draft, setDraft] = React.useState("");

  useChatPolling(transport ?? { sendMessage: async () => {}, poll: async () => [] }, 1200);

  React.useEffect(() => {
    if (conversationId == null || Number.isNaN(conversationId)) return;
    inMemoryMessageStore.markConversationAsRead(conversationId);
  }, [conversationId, filteredMessages.length]);

  React.useEffect(() => {
    if (
      conversationId != null &&
      !Number.isNaN(conversationId) &&
      recipientDisplayName != null &&
      recipientDisplayName !== ""
    ) {
      setConversationDisplayName(conversationId, recipientDisplayName).catch((err) =>
        console.warn("[chat] setConversationDisplayName failed", err)
      );
    }
  }, [conversationId, recipientDisplayName]);

  const data = React.useMemo(() => [...filteredMessages].reverse(), [filteredMessages]);

  const onSend = React.useCallback(async () => {
    if (!transport) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await transport.sendMessage(text);
    } catch (err) {
      console.error("[chat] send failed", err);
      if (__DEV__) throw err;
    }
  }, [draft, transport]);

  const renderItem = React.useCallback(({ item }: { item: ChatMessage }) => {
    const isOut = item.direction === "out";
    return (
      <View style={[styles.row, isOut ? styles.rowOut : styles.rowIn]}>
        <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
          <Text style={[styles.bubbleText, isOut ? styles.bubbleTextOut : styles.bubbleTextIn]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }, []);

  const canSend = draft.trim().length > 0;

  useEffect(() => {
    if (loading || !user) return;
    if (!recipientId) {
      router.replace("/chats" as never);
    }
  }, [loading, user, recipientId, router]);

  const contentReady =
    !loading &&
    !!user &&
    !!recipientId &&
    conversationId != null &&
    !Number.isNaN(conversationId);

  const headerTitle = React.useMemo(() => {
    const v = recipientDisplayName;
    if (v == null) return "Chat";
    return Array.isArray(v) ? (v[0] ?? "Chat") : v;
  }, [recipientDisplayName]);

  // Keep headerShown stable per platform — never toggle it when contentReady flips (Fabric race with root Stack screenOptions).
  const stackOptions = React.useMemo(() => {
    const chatSurface = { contentStyle: { backgroundColor: Theme.chatWallpaper } };
    const chatHeader = {
      headerStyle: { backgroundColor: Theme.chatWallpaper },
      headerTintColor: "#000000" as const,
      headerTitleStyle: { fontWeight: "600" as const, color: "#000000" as const },
    };
    if (Platform.OS === "android") {
      return {
        headerShown: false as const,
        statusBarStyle: "dark" as const,
        ...chatSurface,
      };
    }
    return {
      headerShown: true,
      headerShadowVisible: false,
      title: contentReady ? headerTitle || "Chat" : "Chat",
      ...chatHeader,
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
        >
          <Ionicons name="chevron-back" size={26} color="#000000" />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => router.push({ pathname: "/user-search" })}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
        >
          <Ionicons name="add" size={26} color="#000000" />
        </Pressable>
      ),
      ...chatSurface,
    };
  }, [contentReady, headerTitle, router]);

  return (
    <>
      <Stack.Screen options={stackOptions} />
      {contentReady ? (
        <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
          {Platform.OS === "android" ? (
            <View
              style={[
                styles.androidHeaderWrap,
                {
                  paddingTop:
                    Math.max(insets.top, RNStatusBar.currentHeight ?? 0) ||
                    24,
                },
              ]}
            >
              <View style={styles.androidHeaderBar}>
                <View style={styles.androidHeaderSide}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                      styles.androidHeaderIconBtn,
                      pressed && styles.headerBtnPressed,
                    ]}
                  >
                    <Ionicons name="chevron-back" size={26} color="#000000" />
                  </Pressable>
                </View>
                <Text style={styles.androidHeaderTitle} numberOfLines={1}>
                  {headerTitle || "Chat"}
                </Text>
                <View style={[styles.androidHeaderSide, styles.androidHeaderSideEnd]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Find users"
                    onPress={() => router.push({ pathname: "/user-search" })}
                    style={({ pressed }) => [
                      styles.androidHeaderIconBtn,
                      pressed && styles.headerBtnPressed,
                    ]}
                  >
                    <Ionicons name="add" size={26} color="#000000" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
          <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
          >
            <FlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
              data={data}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              inverted
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message…"
                placeholderTextColor={Theme.secondaryText}
                style={styles.input}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => void onSend()}
                blurOnSubmit={false}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => void onSend()}
                disabled={!canSend}
                style={({ pressed }) => [
                  styles.send,
                  !canSend && styles.sendDisabled,
                  pressed && canSend && styles.sendPressed,
                ]}
              >
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: 8, marginRight: 4 },
  headerBtnPressed: { opacity: 0.8 },

  androidHeaderWrap: {
    backgroundColor: Theme.chatWallpaper,
  },
  androidHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 4,
  },
  androidHeaderSide: {
    width: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  androidHeaderSideEnd: {
    alignItems: "flex-end",
  },
  androidHeaderIconBtn: {
    padding: 8,
  },
  androidHeaderTitle: {
    flex: 1,
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  safe: { flex: 1, backgroundColor: Theme.chatWallpaper },
  container: { flex: 1, backgroundColor: Theme.chatWallpaper },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },

  row: { width: "100%", marginVertical: 6, flexDirection: "row" },
  rowIn: { justifyContent: "flex-start" },
  rowOut: { justifyContent: "flex-end" },

  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleIn: {
    backgroundColor: Theme.bubbleIncoming,
    borderWidth: 1,
    borderColor: Theme.bubbleIncomingBorder,
  },
  bubbleOut: { backgroundColor: Theme.bubbleOutgoing },

  bubbleText: { fontSize: 16, lineHeight: 20 },
  bubbleTextIn: { color: Theme.primaryText },
  bubbleTextOut: { color: Theme.primaryText },

  composer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.hairlineBorder,
    backgroundColor: Theme.chatWallpaper,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 14,
    color: Theme.primaryText,
    backgroundColor: Theme.inputBackground,
  },
  send: {
    alignSelf: "flex-end",
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Theme.sendButton,
    justifyContent: "center",
  },
  sendPressed: { opacity: 0.9 },
  sendDisabled: { backgroundColor: Theme.sendDisabled },
  sendText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
