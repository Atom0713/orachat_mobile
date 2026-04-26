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

import { ConversationListRow } from "../src/chat/ConversationListRow";
import type { ConversationWithLastMessage } from "../src/chat/conversationStore";
import { useConversations } from "../src/chat/useConversations";
import { useInboxPolling } from "../src/chat/useInboxPolling";
import { Theme } from "../src/theme/colors";
import { getLocalUser } from "../src/user/userStore";

function ListTopHairline() {
  return <View style={styles.listEdgeHairline} />;
}

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
    ({ item }: { item: ConversationWithLastMessage }) => (
      <ConversationListRow item={item} onPress={onSelectConversation} />
    ),
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
      headerLeft: () => (
        <Pressable
          onPress={() => router.push({ pathname: "/me" } as never)}
          style={({ pressed }) => [styles.headerBtnLeft, pressed && styles.headerBtnPressed]}
        >
          <Ionicons name="person-circle-outline" size={26} color="#000000" />
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
    };
  }, [contentReady, router]);

  return (
    <>
      <Stack.Screen options={stackOptions} />
      {contentReady ? (
        <SafeAreaView
          style={styles.safe}
          edges={
            contentReady
              ? (["bottom", "left", "right"] as const)
              : (["top", "bottom", "left", "right"] as const)
          }
        >
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
              ListHeaderComponent={ListTopHairline}
              keyboardDismissMode="on-drag"
            />
          )}
        </SafeAreaView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.screenBackground },
  headerBtnLeft: { padding: 8, marginLeft: 4 },
  headerBtn: { padding: 8, marginRight: 4 },
  headerBtnPressed: { opacity: 0.8 },

  list: { flex: 1, backgroundColor: Theme.screenBackground },
  listContent: { flexGrow: 1, paddingBottom: 8 },
  listEdgeHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.hairlineBorder,
  },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { color: Theme.primaryText, fontSize: 18, fontWeight: "600" },
  emptySubtext: { color: Theme.secondaryText, fontSize: 14, marginTop: 8 },
});
