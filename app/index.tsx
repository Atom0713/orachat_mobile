import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMessages } from "../src/chat/inMemoryMessageStore";
import { createPollingTransport } from "../src/chat/transport";
import type { ChatMessage } from "../src/chat/types";
import { useChatPolling } from "../src/chat/useChatPolling";
import { getLocalUser, type LocalUser } from "../src/user/userStore";

export default function Index() {
  const router = useRouter();
  const { recipientId, recipientDisplayName } = useLocalSearchParams<{
    recipientId?: string;
    recipientDisplayName?: string;
  }>();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  const transport = React.useMemo(
    () =>
      user
        ? createPollingTransport({
            senderId: user.id,
            recipientId: recipientId ?? undefined,
          })
        : null,
    [user?.id, recipientId]
  );

  const messages = useMessages();
  const filteredMessages = React.useMemo(() => {
    if (!recipientId) return messages;
    return messages.filter(
      (m) =>
        m.direction === "out" ||
        (m.direction === "in" && m.senderId === recipientId)
    );
  }, [messages, recipientId]);
  const [draft, setDraft] = React.useState("");

  useChatPolling(transport ?? { sendMessage: async () => {}, poll: async () => [] }, 1200);

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

  if (loading || !user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Orachat",
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: "/user-search" })}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
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
            placeholderTextColor="#6B7A90"
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
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: 8, marginRight: 4 },
  headerBtnPressed: { opacity: 0.8 },

  safe: { flex: 1, backgroundColor: "#F5FAFF" },
  container: { flex: 1, backgroundColor: "#F5FAFF" },
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(11, 95, 255, 0.18)",
  },
  bubbleOut: { backgroundColor: "#0B5FFF" },

  bubbleText: { fontSize: 16, lineHeight: 20 },
  bubbleTextIn: { color: "#102A43" },
  bubbleTextOut: { color: "#FFFFFF" },

  composer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(11, 95, 255, 0.12)",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(11, 95, 255, 0.18)",
    borderRadius: 14,
    color: "#102A43",
    backgroundColor: "#F8FBFF",
  },
  send: {
    alignSelf: "flex-end",
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0B5FFF",
    justifyContent: "center",
  },
  sendPressed: { opacity: 0.9 },
  sendDisabled: { backgroundColor: "rgba(11, 95, 255, 0.45)" },
  sendText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
